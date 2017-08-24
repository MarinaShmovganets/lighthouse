"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log = require('lighthouse-logger');
class DefaultReporter {
    stderr(diff) {
        let msg = `  ${log.redify(log.cross)} difference at ${diff.path}: `;
        msg += log.redify(`found ${diff.actual}, expected ${diff.expected}\n`);
        console.log(msg);
    }
    stdoutFailingStatus(count) {
        console.log(log.redify(`${count} passing`));
    }
    stdoutPassingStatus(count) {
        console.log(log.greenify(`${count} passing`));
    }
}
exports.DefaultReporter = DefaultReporter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwb3J0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZXBvcnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBU3pDO0lBQ0UsTUFBTSxDQUFDLElBQVU7UUFDZixJQUFJLEdBQUcsR0FBRyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDO1FBQ3BFLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsSUFBSSxDQUFDLE1BQU0sY0FBYyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQztRQUV2RSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxLQUFhO1FBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsbUJBQW1CLENBQUMsS0FBYTtRQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDaEQsQ0FBQztDQUNGO0FBZkQsMENBZUMifQ==