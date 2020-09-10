function setup_and_run_emscripten(instance, max_steps, run) {
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

    const coords = instance.HEAPF64.subarray(coords_byte_offset / 8,
        coords_byte_offset / 8 + 2 * max_steps);
    const interp_buf = instance.HEAPF64.subarray(interp_buf_byte_offset / 8,
        interp_buf_byte_offset / 8 + 2);
    const arr_steps = instance.HEAPF64.subarray(arr_steps_byte_offset / 8,
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

    run(fractal, interp, arr_steps, coords);

}

// // ### if compiled with: -s MODULARIZE=1
// function setup_and_run(max_steps, run) {
//     if (typeof Module !== 'undefined') {
//         Module().then((instance) => setup_and_run_emscripten(instance, max_steps, run));
//     } else {
//         const script = document.createElement('script');
//         script.src = 'fractal-em.js';
//         script.type = 'text/javascript';
//         script.defer = true;
//         document.getElementsByTagName('head').item(0).appendChild(script);
//         addEventListener("load", () => {
//             Module().then((instance) => setup_and_run_emscripten(instance, max_steps, run));
//         });
//     }
// }

// ### if compiled with: -s MODULARIZE=1 -s EXPORT_ES6=1
function setup_and_run(max_steps, run) {
    import('./fractal-em-es6.js').then((m) => {
        const Module = m.default;
        Module().then((instance) => {
            setup_and_run_emscripten(instance, max_steps, run)
        });
    });
}

export { setup_and_run }
