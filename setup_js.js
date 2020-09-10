function setup_and_run(max_steps,run) {

    const TPL = {
        R: [[0, 1, 'U'], [1, 1, 'R'], [1, 0, 'R'], [0, 0, 'D']],
        L: [[1, 0, 'D'], [0, 0, 'L'], [0, 1, 'L'], [1, 1, 'U']],
        D: [[1, 0, 'L'], [1, 1, 'D'], [0, 1, 'D'], [0, 0, 'R']],
        U: [[0, 1, 'R'], [0, 0, 'U'], [1, 0, 'U'], [1, 1, 'L']]
    }

    const coords = new Float64Array(max_steps * 2);
    const interp_buf = new Float64Array(2);
    const arr_steps = new Float64Array(max_steps);

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
            idx = l + Math.floor((r - l) / 2);
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

    run(fractal, interp, arr_steps, coords);

}

export { setup_and_run }
