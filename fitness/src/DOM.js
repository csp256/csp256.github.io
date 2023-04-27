"use strict";

// Makes the buttons collapse next element when clicked
function collapsible() {
    let coll = document.getElementsByClassName("collapsible");
    for (let i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function () {
            this.classList.toggle("active");
            let content = this.nextElementSibling;
            if (content.style.display === "none") {
                content.style.display = "block";
            } else {
                content.style.display = "none";
            }
        });
    }
}

// When user supplies their own data, hide the text specific to me / my story.
function hide_personal() {
    document.querySelectorAll(".csp").forEach(el => {el.innerHTML = "";});
}

// Called when user manually uploads a CSV file
function handle_files(input) {
    hide_personal();
    let file = input.files[0];
    Papa.parse(
        file, 
        {
            complete: function(results) {
                    update(results.data);
            }
        }
    );
}