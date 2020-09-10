function setup_and_run(max_steps,run) {
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
        const coords = new Float64Array(memory.buffer, heap_offset, max_steps * 2);
        heap_offset += coords.byteLength;

        const interp_buf_offset = heap_offset;
        const interp_buf = new Float64Array(memory.buffer, heap_offset, 2);
        heap_offset += interp_buf.byteLength;

        const arr_steps_offset = heap_offset;
        const arr_steps = new Float64Array(memory.buffer, heap_offset, max_steps);
        heap_offset += arr_steps.byteLength;

        function fractal(rank, size, dx = 0, dy = 0, dir = 'U') {
            c_fractal(coords_offset, rank, size, dx, dy, dir_map[dir]);
            return coords;
        }

        function interp(t, num, _steps, _coords) {
            c_interp(interp_buf_offset, t, num, arr_steps_offset, coords_offset);
            return interp_buf;
        }

        run(fractal, interp, arr_steps, coords);

    });
}

export { setup_and_run }