let io_callback = function(entries, observer) {
    entries.forEach((entry) => {
        if (0.0 < entry.intersectionRatio) {
            bindto_charts["#"+entry.target.id].draw_now();
        }
    });
}

let intersection_observer = new IntersectionObserver(
    io_callback, 
    {
        root: document.body, 
        rootMargin: "0px",
        threshold: 0.01, 
    }
);
