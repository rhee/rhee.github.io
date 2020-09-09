var animation_id;
var coords, interp_buf, arr_steps;

document.refresh = () => {

    const w = 840, h = 840;
    var cnv = document.getElementById("cnv");
    var ctx = cnv.getContext("2d");

    const max_rank = 6, max_steps = Math.pow(4, max_rank + 1);

    var implementation_type;
    if (document.getElementById('js').checked)
        implementation_type = 'js';
    if (document.getElementById('wasm').checked)
        implementation_type = 'wasm';
    if (document.getElementById('emscripten').checked)
        implementation_type = 'emscripten';

    console.log('implementation_type:', implementation_type);

    if (implementation_type == 'emscripten') {

        function setup_and_run(run) {

            // var script = document.createElement('script');
            // script.src = 'fractal-em.js';
            // script.type = 'text/javascript';
            // script.defer = true;
            // document.getElementsByTagName('head').item(0).appendChild(script);
            // addEventListener("load", function () {});

            Module().then((instance) => {

                // directions: 'R', 'L', 'D', 'U'
                const dir_map = {
                    "R": 0,
                    "L": 1,
                    "D": 2,
                    "U": 3,
                };

                const coords_byte_offset = instance._malloc(8 * 2 * max_steps);
                const interp_buf_byte_offset = instance._malloc(8 * 2);
                const arr_steps_byte_offset = instance._malloc(8 * max_steps);

                coords = instance.HEAPF64.subarray(coords_byte_offset / 8,
                    coords_byte_offset / 8 + 2 * max_steps);
                interp_buf = instance.HEAPF64.subarray(interp_buf_byte_offset / 8,
                    interp_buf_byte_offset / 8 + 2);
                arr_steps = instance.HEAPF64.subarray(arr_steps_byte_offset / 8,
                    arr_steps_byte_offset / 8 + max_steps);

                // instance._free(coords_byte_offset);
                // instance._free(interp_buf_byte_offset);
                // instance._free(arr_steps_byte_offset);

                function fractal(rank, size, dx = 0, dy = 0, dir = 'U') {
                    instance.ccall(
                        "c_fractal",
                        null,
                        ["number", "number", "number", "number", "number", "number"], // Float64Array must be "number"
                        [coords_byte_offset, rank, size, dx, dy, dir_map[dir]]
                    );
                    return coords;
                }

                function interp(t, num, steps, coords) {
                    instance.ccall(
                        "c_interp",
                        null,
                        ["number", "number", "number", "number", "number"], // Float64Array must be "number"
                        [interp_buf_byte_offset, t, num, arr_steps_byte_offset, coords_byte_offset]
                    );
                    return interp_buf;
                }

                run(fractal, interp);

            })
        }

    }

    if (implementation_type == 'wasm') {

        function setup_and_run(run) {
            WebAssembly.instantiateStreaming(fetch("fractal-opt.wasm"), {
                // for this example, we don't import anything
                imports: {},
            }).then(obj => {

                const { memory, __heap_base, c_fractal, c_interp } = obj.instance.exports;

                memory.grow(8); // 2 ==> 10

                // directions: 'R', 'L', 'D', 'U'
                const dir_map = {
                    "R": 0,
                    "L": 1,
                    "D": 2,
                    "U": 3,
                };

                // malloc
                var heap_offset = __heap_base;

                const coords_offset = heap_offset;
                coords = new Float64Array(memory.buffer, heap_offset, max_steps * 2);
                heap_offset += coords.byteLength;

                const interp_buf_offset = heap_offset;
                interp_buf = new Float64Array(memory.buffer, heap_offset, 2);
                heap_offset += interp_buf.byteLength;

                const arr_steps_offset = heap_offset;
                arr_steps = new Float64Array(memory.buffer, heap_offset, max_steps);
                heap_offset += arr_steps.byteLength;

                function fractal(rank, size, dx = 0, dy = 0, dir = 'U') {
                    c_fractal(coords_offset, rank, size, dx, dy, dir_map[dir]);
                    return coords;
                }

                function interp(t, num, _steps, _coords) {
                    c_interp(interp_buf_offset, t, num, arr_steps_offset, coords_offset);
                    return interp_buf;
                }

                run(fractal, interp);

            });
        }

    }

    if (implementation_type == 'js') {

        function setup_and_run(run) {

            const TPL = {
                R: [[0, 1, 'U'], [1, 1, 'R'], [1, 0, 'R'], [0, 0, 'D']],
                L: [[1, 0, 'D'], [0, 0, 'L'], [0, 1, 'L'], [1, 1, 'U']],
                D: [[1, 0, 'L'], [1, 1, 'D'], [0, 1, 'D'], [0, 0, 'R']],
                U: [[0, 1, 'R'], [0, 0, 'U'], [1, 0, 'U'], [1, 1, 'L']]
            }

            coords = new Float64Array(max_steps * 2);
            interp_buf = new Float64Array(2);
            arr_steps = new Float64Array(max_steps);

            function fractal_0(coords, idx, rank, size, dx, dy, dir) {
                if (rank === 0) {
                    for (let i = 0; i < 4; i++) {
                        const p = TPL[dir][i];
                        coords[idx + 2 * i + 0] = dx + p[0] * size;
                        coords[idx + 2 * i + 1] = dy + p[1] * size;
                    }
                } else {
                    const space = size / (Math.pow(2, rank + 1) - 1);
                    const new_size = (size - space) / 2;
                    const d2 = new_size + space;
                    const sub_steps = Math.pow(4, rank - 1 + 1);
                    for (let i = 0, new_idx = idx; i < 4; i++ , new_idx += sub_steps * 2) {
                        const p = TPL[dir][i];
                        fractal_0(coords, new_idx, rank - 1, new_size, dx + p[0] * d2, dy + p[1] * d2, p[2]);
                    }
                }
            }

            function fractal(rank, size, dx = 0, dy = 0, dir = 'U') {
                fractal_0(coords, 0, rank, size, dx, dy, dir);
                return coords;
            }

            function interp(t, num, steps, coords) {
                /* find index */
                if (t < steps[0]) {
                    interp_buf[0] = coords[0];
                    interp_buf[1] = coords[1];
                    return interp_buf
                }
                const last = num - 1
                if (t > steps[last]) {
                    interp_buf[0] = coords[last * 2 + 0];
                    interp_buf[1] = coords[last * 2 + 1];
                    return interp_buf
                }
                let idx, l = 0, r = last;
                while (r - l > 1) {
                    idx = l + ((r - l) / 2) | 0;
                    if (t > steps[idx]) {
                        l = idx;
                    } else {
                        r = idx;
                    }
                }
                /* now `l` have the start index of step */
                /* interpolate within step */
                const ix = l, dt = t - steps[ix], ds = steps[ix + 1] - steps[ix];
                const sx = coords[ix * 2 + 0], sy = coords[ix * 2 + 1], dx = coords[(ix + 1) * 2 + 0] - sx, dy = coords[(ix + 1) * 2 + 1] - sy;
                interp_buf[0] = sx + dt * dx / ds;
                interp_buf[1] = sy + dt * dy / ds;
                return interp_buf
            }

            run(fractal, interp);

        }

    }

    function main(fractal, interp) {

        console.log(fractal);
        console.log(interp);

        const fps15 = Number.parseInt(document.getElementById('fps15').value);
        const fps = fps15 * 15;
        document.getElementById('fpsVal').innerHTML = fps;
        const rank = Number.parseInt(document.getElementById('rank').value);
        document.getElementById('rankVal').innerHTML = rank;
        const ants500 = Number.parseInt(document.getElementById('ants500').value);
        const num_ants = ants500 * 500;
        document.getElementById('antsVal').innerHTML = num_ants;
        const use_image_buffer = document.getElementById('use_image_buffer').checked;

        console.log('fps:', fps);
        console.log('rank:', rank);
        console.log('num_ants:', num_ants);
        console.log('use_image_buffer:', use_image_buffer);

        const fps_interval = 1000 / fps;
        const max_vel = 1.0 * 0.05 / fps; // 1 초에 0.05 이동 (20초 후 완주)
        const min_vel = max_vel / 5; // 완주 하는데 100초
        const num_steps = Math.pow(4, rank + 1);

        console.log('num_steps:', num_steps);
        console.log('min_vel:', min_vel);
        console.log('max_vel:', max_vel);

        /* build up step border values */
        for (let i = 0; i < num_steps; i++)
            arr_steps[i] = i / num_steps;

        function draw_hilbert(ctx, w, h, num_steps, coords) {
            ctx.beginPath();
            ctx.clearRect(0, 0, w, h);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#eeeeee'; //document.getElementById('color').value;
            ctx.moveTo(coords[0], coords[1]);
            for (let i = 1; i < num_steps; i++) {
                ctx.lineTo(coords[i * 2 + 0], coords[i * 2 + 1]);
            }
            ctx.stroke();
        }

        function populate_ants(num_ants, min_vel, max_vel) {
            /* place ants of various speeds */
            const ants = [];
            for (let i = 0; i < num_ants; i++) {
                const start_pos = Math.random();
                const vel = Math.random() * (max_vel - min_vel) + min_vel;
                const r = (vel / (max_vel - min_vel) * 128) | 0 + 128;
                const g = 0;
                const b = 0;
                ants.push([start_pos, vel, r, g, b])
            }
            // sort to render brighter ant later, above other dark ants
            ants.sort((a, b) => a[2] - b[2]);
            return ants;
        }

        /* place ants of various speeds */
        const ants = populate_ants(num_ants, min_vel, max_vel);

        // create path coords array
        fractal(rank, Math.max(w, h) - 40, 15, 15, 'U');

        // draw path
        draw_hilbert(ctx, w, h, num_steps, coords);

        // cache path image
        const bg_cache = ctx.getImageData(0, 0, w, h);

        // keep frame misses
        const frame_misses = [];
        var num_frame_misses = 0; // EMWA

        function draw_fps(ctx, misses) {
            const msg = 'mean frame miss/sec: ' + (misses | 0);
            ctx.font = '24px monospace';
            const m = ctx.measureText(msg);
            const box_w = m.width, box_a = m.actualBoundingBoxAscent, box_d = m.actualBoundingBoxDescent;
            const box_h = box_a + box_d;
            const cx = ((w - box_w) / 2) | 0, cy = ((h - box_h) / 2) | 0;
            ctx.fillStyle = '#eeeeee';
            ctx.fillRect(cx - 5, cy - 5, box_w + 10, box_h + 10)
            ctx.fillStyle = 'black';
            ctx.font = '24px monospace';
            ctx.fillText(msg, cx, cy + box_a);
        }

        function ant_location(t, ant) {
            const start_pos = ant[0];
            const vel = ant[1]
            const r = ant[2], g = ant[3], b = ant[4];
            const pos = (start_pos + t * vel) % 1.0;
            const [x, y] = interp(pos, num_steps, arr_steps, coords);
            const xx = x | 0, yy = y | 0;
            return [xx, yy, r, g, b]
        }

        if (use_image_buffer) {
            function step(t) {
                var im, data;
                data = (im = ctx.createImageData(bg_cache)).data;
                data.set(bg_cache.data);
                ants.forEach((ant) => {
                    const [x, y, r, g, b] = ant_location(t, ant);
                    for (let px = -2; px < 3; px++) {
                        for (let py = -2; py < 3; py++) {
                            const ix = (x + px + (y + py) * w) * 4;
                            data[ix + 0] = r; /* R */
                            data[ix + 1] = g; /* G */
                            data[ix + 2] = b; /* B */
                            data[ix + 3] = 255; /* A */
                        }
                    }
                })
                ctx.putImageData(im, 0, 0);
                draw_fps(ctx, num_frame_misses);
            }
        } else {
            function step(t) {
                ctx.putImageData(bg_cache, 0, 0);
                ants.forEach((ant) => {
                    const [x, y, r, g, b] = ant_location(t, ant);
                    ctx.fillStyle = `rgb(${r},${g},${b})`;
                    ctx.fillRect(x - 2, y - 2, 5, 5);
                })
                draw_fps(ctx, num_frame_misses);
            }
        }

        var t_epoch, t_prev;
        t_prev = t_epoch = performance.now();

        function animate(_t_hires) {
            const t_now = performance.now(); // 현재시간
            const t_elapsed = t_now - t_prev; // 렌더링 시작 후 실행까지 걸린 시간

            // 다음 프레임을 미리 요청. 1/60 초 이내 여러 번 요청해도 1/60 초 후 한 번만 콜백.
            animation_id = requestAnimationFrame(animate);

            // 아직 그릴 필요 없음
            if (!(t_elapsed >= fps_interval)) {
                return;
            }

            // 한 프레임 이상 놓쳤음
            if (t_elapsed >= 2 * fps_interval) {
                //console.error('frames skipped');
                frame_misses.push(t_now);
            }

            // trim array, keep only 30 * max_fps items
            const max_misses = 30 * 60;
            if (frame_misses.length > max_misses)
                frame_misses.splice(0, frame_misses.length - max_misses);
            // count frame misses in last 1000 ms
            const misses = frame_misses.filter(t => t_now - t < 1000).length;
            // emwa
            num_frame_misses = num_frame_misses * 0.95 + misses * 0.05;

            // 렌더링 시작
            t_prev = performance.now();
            step((t_now - t_epoch) / 1000);
        }

        cancelAnimationFrame(animation_id);
        animation_id = requestAnimationFrame(animate);

    }

    setup_and_run(main);

}

document.refresh();