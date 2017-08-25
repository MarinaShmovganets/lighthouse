"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log = require('lighthouse-logger');
class DefaultReporter {
    stderr(diff) {
        let msg = `  ${log.redify(log.cross)} difference at ${diff.path}: `;
        msg += log.redify(`found ${diff.actual}, expected ${JSON.stringify(diff.expected, null, 2)}\n`);
        console.log(msg);
    }
    stdoutFailingStatus(count) {
        console.log(log.redify(`${count} failing`));
    }
    stdoutPassingStatus(count) {
        console.log(log.greenify(`${count} passing`));
    }
}
exports.DefaultReporter = DefaultReporter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwb3J0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZXBvcnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBU3pDO0lBQ0UsTUFBTSxDQUFDLElBQVc7UUFDaEIsSUFBSSxHQUFHLEdBQUcsS0FBSyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQztRQUNwRSxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLElBQUksQ0FBQyxNQUFNLGNBQWMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFaEcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNuQixDQUFDO0lBRUQsbUJBQW1CLENBQUMsS0FBYTtRQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELG1CQUFtQixDQUFDLEtBQWE7UUFDL0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDO0lBQ2hELENBQUM7Q0FDRjtBQWZELDBDQWVDIn0=