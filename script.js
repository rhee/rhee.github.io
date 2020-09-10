var animation_id;
// var coords, interp_buf, arr_steps;

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
            import('./setup_emscripten.js').then((m) => {
                m.setup_and_run(max_steps,run);
            })
        }
    }

    if (implementation_type == 'wasm') {
        function setup_and_run(run) {
            import('./setup_wasm.js').then((m) => {
                m.setup_and_run(max_steps,run);
            })
        }
    }

    if (implementation_type == 'js') {
        function setup_and_run(run) {
            import('./setup_js.js').then((m) => {
                m.setup_and_run(max_steps,run);
            })
        }
    }

    function main(fractal, interp, arr_steps, coords) {

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
        const max_vel = 1.0 * 0.002; // 1 초에 0.002 이동 (500초 후 완주)
        const min_vel = max_vel / 5; // 완주 하는데 2500초
        const num_steps = Math.pow(4, rank + 1);

        console.log('num_steps:', num_steps);
        console.log('min_vel:', min_vel);
        console.log('max_vel:', max_vel);

        const frame_miss_check_interval = 1000;
        var t_frame_miss_check = performance.now(),
            frame_misses = 0,
            frame_misses_update = frame_misses;

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
                const r = Math.floor((vel-min_vel) / (max_vel - min_vel) * 128) + 128;
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

        function draw_fps(ctx) {
            const t_now = performance.now();
            if (t_now >= t_frame_miss_check + frame_miss_check_interval) {
                frame_misses_update = Math.floor(frame_misses * 1000 / (t_now-t_frame_miss_check));
                frame_misses = 0;
                t_frame_miss_check = t_now;
            }
            const msg = 'frame misses/sec: ' + frame_misses_update;
            ctx.font = '24px monospace';
            const m = ctx.measureText(msg);
            const box_w = m.width, box_a = m.actualBoundingBoxAscent, box_d = m.actualBoundingBoxDescent;
            const box_h = box_a + box_d;
            const cx = Math.floor((w - box_w) / 2), cy = Math.floor((h - box_h) / 2);
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
            return [x, y, r, g, b]
        }

        if (use_image_buffer) {
            function step(t) {
                var im, data;
                data = (im = ctx.createImageData(bg_cache)).data;
                data.set(bg_cache.data);
                ants.forEach((ant) => {
                    const [x, y, r, g, b] = ant_location(t, ant);
                    const xx = Math.floor(x), yy = Math.floor(y);
                    for (let px = -2; px < 3; px++) {
                        for (let py = -2; py < 3; py++) {
                            const ix = (xx + px + (yy + py) * w) * 4;
                            data[ix + 0] = r; /* R */
                            data[ix + 1] = g; /* G */
                            data[ix + 2] = b; /* B */
                            data[ix + 3] = 255; /* A */
                        }
                    }
                })
                ctx.putImageData(im, 0, 0);
                draw_fps(ctx);
            }
        } else {
            function step(t) {
                ctx.putImageData(bg_cache, 0, 0);
                ants.forEach((ant) => {
                    const [x, y, r, g, b] = ant_location(t, ant);
                    ctx.fillStyle = `rgb(${r},${g},${b})`;
                    ctx.fillRect(x - 2, y - 2, 5, 5);
                })
                draw_fps(ctx);
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
                frame_misses += Math.floor(t_elapsed / fps_interval) - 1;
            }

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