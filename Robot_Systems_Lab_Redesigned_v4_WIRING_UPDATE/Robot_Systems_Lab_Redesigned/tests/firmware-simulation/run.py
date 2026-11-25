import json, os, shutil, subprocess, sys
c = json.load(open('case.json'))
H = './harness'
results = []
def setup(name, csv=None, extra=None, command=''):
    d = os.path.abspath('runs/' + name); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    if csv is not None: open(d + '/robot.csv', 'w', newline='').write(csv)
    for fn, content in (extra or {}).items(): open(d + '/' + fn, 'w', newline='').write(content)
    open(d + '/masks.txt', 'w').write(c['masks'])
    open(d + '/command.txt', 'w').write(command)
    return d
def run(scen, d, fail=0):
    return subprocess.run([H, scen, d, str(fail)], capture_output=True, timeout=60).stdout.decode('latin1')
def read(d, fn):
    p = d + '/' + fn
    return open(p, newline='').read() if os.path.exists(p) else None
def check(name, cond, info=''):
    results.append(cond); print(('PASS ' if cond else 'FAIL ') + name + (('  ' + info) if info and not cond else ''))
original = c['download'] + c['tail']
rw = f"RW,{c['bytes']},{c['crc']},{c['count']}\n"

d = setup('version', original, command='V\n'); out = run('version', d)
check('V replies with firmware id', '#FW,RSL_CSV_MANAGE_1' in out)

d = setup('rw_ok', original, command=rw); out = run('rw_ok', d)
newcsv = read(d, 'robot.csv')
check('RW: #RW_OK with deleted count', f"#RW_OK,{c['count']},{len(c['expected'])}" in out, out[-300:])
check('RW: file equals download minus selected lines, plus later rows', newcsv == c['expected'])
check('RW: header kept', newcsv.startswith(c['header']))
check('RW: no robot.tmp or robot.bak left', read(d, 'robot.tmp') is None and read(d, 'robot.bak') is None)
check('RW: progress and verify messages sent', '#RW_PROGRESS,' in out and '#RW_VERIFY' in out)
check('RW: asked for 5 mask chunks (lines 0..300)', out.count('#RW_NEXT,') == 5, str(out.count('#RW_NEXT,')))

d = setup('rw_changed', original, command=f"RW,{c['bytes']},0000,{c['count']}\n"); out = run('rw_changed', d)
check('wrong CRC: #RW_ERROR_CHANGED', '#RW_ERROR_CHANGED' in out)
check('wrong CRC: file unchanged, no tmp', read(d, 'robot.csv') == original and read(d, 'robot.tmp') is None)

d = setup('rw_short', c['download'][:-40], command=rw); out = run('rw_short', d)
check('file shorter than the download: #RW_ERROR_CHANGED', '#RW_ERROR_CHANGED' in out)

d = setup('rw_boundary', original, command=f"RW,{c['bytes']-1},{c['crc']},{c['count']}\n"); out = run('rw_boundary', d)
check('byte count not at a line end: #RW_ERROR_CHANGED', '#RW_ERROR_CHANGED' in out and read(d, 'robot.csv') == original)

d = setup('rw_count', original, command=f"RW,{c['bytes']},{c['crc']},{c['count']+1}\n"); out = run('rw_count', d)
check('wrong count: #RW_ERROR_COUNT_MISMATCH, unchanged', '#RW_ERROR_COUNT_MISMATCH' in out and read(d, 'robot.csv') == original)

d = setup('cancel', original, command=rw); out = run('cancel', d)
check('RWX cancel: #RW_ERROR_CANCELLED, unchanged, no tmp', '#RW_ERROR_CANCELLED' in out and read(d, 'robot.csv') == original and read(d, 'robot.tmp') is None)

d = setup('timeout', original, command=rw); out = run('timeout', d)
check('no phone reply: #RW_ERROR_TIMEOUT, unchanged', '#RW_ERROR_TIMEOUT' in out and read(d, 'robot.csv') == original)

d = setup('args', original, command="RW,abc,12,3\n"); out = run('args', d)
check('bad RW arguments: #RW_ERROR_ARGS, nothing rewritten', '#RW_ERROR_ARGS' in out and '#RW_NEXT' not in out and read(d, 'robot.csv').startswith(original))

d = setup('replace_fail', original, command=rw); out = run('replace_fail', d, fail=0b10)
check('tmp->csv rename fails: original restored, #RW_ERROR_REPLACE_FAILED', '#RW_ERROR_REPLACE_FAILED' in out and read(d, 'robot.csv') == original and read(d, 'robot.bak') is None and read(d, 'robot.tmp') is None)

d = setup('restore_pending', original, command=rw); out = run('restore_pending', d, fail=0b110)
check('restore also fails: #RW_ERROR_RESTORE_PENDING, original kept as robot.bak', '#RW_ERROR_RESTORE_PENDING' in out and read(d, 'robot.csv') is None and read(d, 'robot.bak') == original)
out = run('boot', d)
check('next power-up restores robot.csv from robot.bak', read(d, 'robot.csv') == original and read(d, 'robot.bak') is None and read(d, 'robot.tmp') is None)

d = setup('boot_after_swap', c['expected'], extra={'robot.bak': original})
out = run('boot', d)
check('power cut after swap: new robot.csv kept, robot.bak removed', read(d, 'robot.csv') == c['expected'] and read(d, 'robot.bak') is None)

d = setup('boot_tmp', original, extra={'robot.tmp': 'partial'})
out = run('boot', d)
check('leftover robot.tmp removed at power-up', read(d, 'robot.tmp') is None and read(d, 'robot.csv') == original)

d = setup('delall', original, command='DELALL\n'); out = run('delall', d)
hdr = c['header'] + '\r\n'
check('DELALL: #DEL_OK with header size', f'#DEL_OK,{len(hdr)}' in out, out[-200:])
check('DELALL: robot.csv holds only the header', read(d, 'robot.csv') == hdr)

d = setup('busy', original, command='DELALL\nD\n'); out = run('busy', d)
check('second file command while one is pending: #BUSY', '#BUSY' in out and '#DEL_OK' in out)

d = setup('download', original, command='D\n'); out = run('download', d)
check('download unchanged: #CSV_BEGIN,<size> + exact bytes + #CSV_END', f"#CSV_BEGIN,{len(original)}\n{original}\n#CSV_END\n" in out)

d = setup('missing_header', '', command='D\n'); out = run('download', d)
check('empty robot.csv gets a header after download reopen', read(d, 'robot.csv').startswith(c['header']))

out = run('label', setup('label', original))
check('current source label order: left faster logs MANUAL_TURN_LEFT', out.split() == ['MANUAL_TURN_LEFT', 'MANUAL_TURN_RIGHT'], out)

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
