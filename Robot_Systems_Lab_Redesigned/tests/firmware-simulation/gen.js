// Builds test data with the controller's own helper functions.
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const tools = html.match(/<script id="csv-tools">([\s\S]*?)<\/script>/)[1];
const api = new Function(tools + '; return {csvCrcHex, csvMaskHex, csvRemoveLines};')();
const header = 'time_ms,mode,left_ir_blocked,front_ir_blocked,right_ir_blocked,front_distance_cm,ultrasonic_echo_valid,servo_angle_commanded,left_pwm_commanded,right_pwm_commanded,left_dir_pin,right_dir_pin,motor_action,bluetooth_connected,joystick_x,joystick_y';
let t = 520, rows = [];
for (let i = 0; i < 300; i++) {
  t += 200 + (i % 7);
  const auto = i % 3 !== 0;
  rows.push([t, auto ? 'AUTO' : 'MANUAL', 0, i % 11 === 0 ? 1 : 0, 0, 20 + (i * 7) % 180, 1, 90, auto ? 110 : 0, auto ? 110 : 0, 1, 0, auto ? 'FORWARD' : 'STOP', 1, 0, 0].join(','));
}
const download = [header, ...rows].map(l => l + '\r\n').join('');
const tail = ['70001,AUTO,0,0,0,150,1,90,110,110,1,0,FORWARD,1,0,0', '70202,AUTO,0,0,0,148,1,90,110,110,1,0,FORWARD,1,0,0'].map(l => l + '\r\n').join('');
const sel = new Set([1, 2, 63, 64, 65, 127, 128, 129, 200, 201, 202, 203, 204, 205, 299, 300]);
const lineCount = download.split('\n').length - 1;
const masks = [];
for (let i = 0; i < lineCount; i += 64) masks.push(i + ' ' + api.csvMaskHex(sel, i));
const out = {
  download, tail,
  crc: api.csvCrcHex(download), count: sel.size, bytes: download.length,
  masks: masks.join('\n') + '\n',
  expected: api.csvRemoveLines(download, sel) + tail,
  header
};
fs.writeFileSync('case.json', JSON.stringify(out));
console.log('lines', lineCount, 'bytes', download.length, 'crc', out.crc, 'delete', sel.size, 'masks', masks.length);
