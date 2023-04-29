

let intersection_observer = new IntersectionObserver(
    callback, 
    {
        root: document.querySelector("#scrollArea"),
        rootMargin: "0px",
        threshold: 0.0, // even 1 pixel showing is enough
    }
);