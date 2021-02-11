import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";
import Log from "../Util";

export default class Scheduler implements IScheduler {

    private orderedTimeSlots = ["MWF 0800-0900" , "MWF 0900-1000" , "MWF 1000-1100" ,
        "MWF 1100-1200" , "MWF 1200-1300" , "MWF 1300-1400" ,
        "MWF 1400-1500" , "MWF 1500-1600" , "MWF 1600-1700" ,
        "TR  0800-0930" , "TR  0930-1100" , "TR  1100-1230" ,
        "TR  1230-1400" , "TR  1400-1530" , "TR  1530-1700"];

    private courseTimeSlots: {[index: string]: TimeSlot[]} = {}; // keeps track of which courses are in what time-slot
    private roomsFilled: {[index: string]: TimeSlot[]} = {};

    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        let result: Array<[SchedRoom, SchedSection, TimeSlot]> = [];
        let usedRooms: SchedRoom[] = []; // TODO: optimize this might timeout with large sections and rooms
        sections = this.sortSections(sections);
        rooms = this.sortRooms(rooms);
        let found;
        let roomId;
        for (let s of sections) {
            if (this.courseTimeSlots[s.courses_dept + s.courses_id] === undefined) {
                this.courseTimeSlots[s.courses_dept + s.courses_id] = [];
            }
            found = this.findPlacement(s, rooms);
            if (found !== false && typeof found !== "boolean") {
                roomId = found.room.rooms_shortname + found.room.rooms_number;
                this.courseTimeSlots[s.courses_dept + s.courses_id].push(found.timeslot);
                this.roomsFilled[roomId].push(found.timeslot);
                result.push([found.room, s, found.timeslot]);
                usedRooms.push(found.room);
                rooms = this.dynamicRoomsSort(usedRooms, rooms);
            }
        }
        return result;
    }

    private isValidPlace(section: SchedSection, r: SchedRoom, t: TimeSlot): boolean {
        let className = section.courses_dept + section.courses_id;
        if (this.courseTimeSlots[className].includes(t)) {
            return false;
        } else if (this.roomsFilled[r.rooms_shortname + r.rooms_number].includes(t)) {
            return false;
        } else if (r.rooms_seats < (section.courses_pass + section.courses_fail + section.courses_audit) ) {
            return false;
        }
        return true;
    }

    private findPlacement (section: SchedSection, rooms: SchedRoom[]): {room: SchedRoom, timeslot: TimeSlot} | false {
        let timeslot: TimeSlot;
        for (let t of this.orderedTimeSlots) {
            timeslot = t as TimeSlot;
            for (let r of rooms) {
                if (this.roomsFilled[r.rooms_shortname + r.rooms_number] === undefined) {
                    this.roomsFilled[r.rooms_shortname + r.rooms_number] = [];
                }
                if (this.isValidPlace(section, r, timeslot)) {
                    return {room: r, timeslot: timeslot};
                }
            }
        }
        return false;
    }

    public DScore(schedRooms: SchedRoom[]): number {
        const furthestDistance = 1372;
        if (schedRooms.length === 0 ) {
            return Infinity;
        } else if (schedRooms.length === 1 ) {
            return 0;
        }
        let maxDist = -1;
        let dist;
        for (const i of schedRooms) {
            for (const j of schedRooms) {
                dist = this.haversine(i.rooms_lat, i.rooms_lon, j.rooms_lat, j.rooms_lon);
                if (dist > furthestDistance) {
                    throw new Error("something broke, distance > 1372: " + dist);
                }
                if (dist > maxDist) {
                    maxDist = dist;
                }
            }
        }
        return maxDist / furthestDistance;
    }

    public EScore(timeTableSections: SchedSection[], sections: SchedSection[]): number {
        let enroll = 0;
        let totalEnroll = 0;
        for (let s of timeTableSections) {
            enroll += s.courses_pass + s.courses_fail + s.courses_audit;
        }
        for (let s of sections) {
            totalEnroll += s.courses_pass + s.courses_fail + s.courses_audit;
        }
        return enroll / totalEnroll;
    }

    // from given: https://www.movable-type.co.uk/scripts/latlong.html
    private haversine (latOne: number, lonOne: number , latTwo: number, lonTwo: number ): number {
        const R = 6371e3; // metres
        const toRad = ((n: number) => n * Math.PI / 180);
        const φ1 = toRad(latOne);
        const φ2 = toRad(latTwo);
        const Δφ = toRad((latTwo - latOne));
        const Δλ = toRad((lonTwo - lonOne));

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const d = R * c;
        return d;
    }

    public computeScore(d: number, e: number): number {
        return (0.7 * e) + (0.3 * (1 - d)); // 70% from e, 30% from d
    }

    private sortSections(sections: SchedSection[]): SchedSection[] { // sorts by enrollment
        sections.sort(function (a, b) {
            const enrollA = a.courses_pass + a.courses_fail + a.courses_audit;
            const enrollB = b.courses_pass + b.courses_fail + b.courses_audit;
            if (enrollA < enrollB) {
                return 1;
            }
            if (enrollA > enrollB) {
                return -1;
            }
            return 0;
        });
        return sections;
    }

    private dynamicRoomsSort(foundRooms: SchedRoom[], rooms: SchedRoom[]): SchedRoom[] {
        const localHaversine = function (latOne: number, lonOne: number , latTwo: number, lonTwo: number ): number {
            const R = 6371e3; // metres
            const toRad = ((n: number) => n * Math.PI / 180);
            const φ1 = toRad(latOne);
            const φ2 = toRad(latTwo);
            const Δφ = toRad((latTwo - latOne));
            const Δλ = toRad((lonTwo - lonOne));

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            const d = R * c;
            return d;
        };
        if (foundRooms.length < 2) {
            return rooms;
        }
        let midPoint = this.findMidPoint(foundRooms);

        // sort by the distance from the midpoint
        rooms.sort(function (a, b) {
            let DistA: number = localHaversine(midPoint.lat, midPoint.lon, a.rooms_lat, a.rooms_lon);
            let DistB: number = localHaversine(midPoint.lat, midPoint.lon, b.rooms_lat, b.rooms_lon);
            if (DistA < DistB) {
                return -1;
            }
            if (DistA > DistB) {
                return 1;
            }
            return 0;
        });
        return rooms;
    }

    private findMidPoint(rooms: SchedRoom[]): {lat: number, lon: number} {
        let room1, room2;
        let maxDist = -1;
        let h;
        let midLat, midLon;
        for (let i of rooms) {
            for (let j of rooms) {
                h = this.haversine(i.rooms_lat, i.rooms_lon, j.rooms_lat, j.rooms_lon);
                if ( h > maxDist) {
                    maxDist = h;
                    room1 = i;
                    room2 = j;
                }
            }
        }
        midLat = (room1.rooms_lat + room2.rooms_lat) / 2; // does not consider curvature of the earth (pretend its flat)
        midLon = (room1.rooms_lon + room2.rooms_lon) / 2;
        return {lat: midLat, lon: midLon};
    }

    // sorts rooms based on the average distance between buildings (rooms within the same building are excluded)
    private sortRooms(rooms: SchedRoom[]): SchedRoom[] {
        let avgDistance;
        let count;
        let latI, lonI, latJ, lonJ;
        let avgDistanceMap: {[index: string]: number} = {};
        for (let i of rooms) {
            latI = i.rooms_lat;
            lonI = i.rooms_lon;
            avgDistance = 0;
            count = 0;
            for (let j of rooms) {
                latJ = j.rooms_lat;
                lonJ = j.rooms_lon;
                if (latI !== latJ || lonI !== lonJ) {
                    count ++;
                    avgDistance += this.haversine(latI, lonI, latJ, lonJ);
                }
            }
            avgDistance /= count;
            avgDistanceMap[i.rooms_shortname + i.rooms_number] = avgDistance;
        }
        rooms.sort(function (a, b) {
            let avgDistA: number = avgDistanceMap[a.rooms_shortname + a.rooms_number];
            let avgDistB: number = avgDistanceMap[b.rooms_shortname + b.rooms_number];
            if (avgDistA < avgDistB) {
                return -1;
            }
            if (avgDistA > avgDistB) {
                return 1;
            }
            return 0;
        });
        return rooms;
    }
}
