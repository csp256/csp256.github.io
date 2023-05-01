"use strict";
// ██    ██ ██████  ██      
// ██    ██ ██   ██ ██      
// ██    ██ ██████  ██      
// ██    ██ ██   ██ ██      
//  ██████  ██   ██ ███████ 
                         
function jump_to_url_anchor() {
    const anchor = get_url_anchor()
    if (anchor != null) { 
        location.href = "#" + anchor;
    }
}

function get_url_anchor() {
    return (1 < document.URL.split('#').length) 
        ? document.URL.split('#')[1] 
        : null;
}

function is_safari() {
    return navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') <= -1;
}

// ███████ ██ ██      ████████ ███████ ██████  ██ ███    ██  ██████  
// ██      ██ ██         ██    ██      ██   ██ ██ ████   ██ ██       
// █████   ██ ██         ██    █████   ██████  ██ ██ ██  ██ ██   ███ 
// ██      ██ ██         ██    ██      ██   ██ ██ ██  ██ ██ ██    ██ 
// ██      ██ ███████    ██    ███████ ██   ██ ██ ██   ████  ██████  

// Note this function will "snap" to new values if SMA is 0
function simple_moving_average(input, interval) {
    const length = input.length;
    let output = [];
    let i = 0;
    let sum = 0;

    let snap = 0; // typically, index of first non-trivial value
    while (i < interval && i < length) {
        if (sum == 0) {
            sum = input[i];
            snap = 0;
        } else {
            sum += input[i];
        }
        i++;
        output.push(sum / (i - snap));
    }

    while (interval <= i && i < length) {
        if (sum == 0) {
            sum = input[i];
            snap = i;
            output.push( sum );
        } else {
            if (i - interval < snap) {
                // still warming up
                sum += input[i];
                output.push(sum / (1 + (i - snap)));
            } else {
                // nominal case
                sum += input[i] - input[i - interval];
                output.push(sum / interval);
            }
        }
        i++;
    }

    return output;
}

// function exponential_moving_average(input, alpha) {
//     const len = input.length;
//     let output = [];
//     let i = 0;
//     let low_pass;

//     for (; i < len; i++) {
//         output.push(input[i]);
//         if (input[i] != 0) {
//             low_pass = input[i];
//             break;
//         }
//     }
//     // let's play: spot the bug that doesn't matter!
//     for (;i < len; i++) {
//         low_pass = (input[i] - low_pass) * alpha + input[i];
//         outut.push(low_pass);
//     }
//     return output;
// }

// ██   ██  █████  ██████   █████  ███    ███  █████  ██████  ██████  
// ██   ██ ██   ██ ██   ██ ██   ██ ████  ████ ██   ██ ██   ██ ██   ██ 
// ███████ ███████ ██   ██ ███████ ██ ████ ██ ███████ ██████  ██   ██ 
// ██   ██ ██   ██ ██   ██ ██   ██ ██  ██  ██ ██   ██ ██   ██ ██   ██ 
// ██   ██ ██   ██ ██████  ██   ██ ██      ██ ██   ██ ██   ██ ██████  
     
function hadamard_sum(array) {
    const num_arrays = array.length;
    const len = array[0].length;
    let output = [...array[0]];
    for (let array_index = 1; array_index < num_arrays; array_index++) {
        for (let idx = 0; idx < len; idx++) {
            output[idx] += array[array_index][idx];
        }
    }
    return output;
}

function hadamard_difference(a, b) {
    const len = a.length;
    let output = [...a];
    for (let i = 0; i < len; i++) {
        output[i] -= b[i];
    }
    return output;
}

function hadamard_product(a, b) {
    const len = a.length;
    let output = [...a];
    for (let i = 0; i < len; i++) {
        output[i] *= b[i];
    }
    return output;    
}

function hadamard_quotient(a, b) {
    const len = a.length;
    let output = [...a];
    for (let i = 0; i < len; i++) {
        (b[i] == 0)
            ? output[i] = null
            : output[i] /= b[i];
    }
    return output;    
}

//  █████  ██████  ██████   █████  ██    ██ 
// ██   ██ ██   ██ ██   ██ ██   ██  ██  ██  
// ███████ ██████  ██████  ███████   ████   
// ██   ██ ██   ██ ██   ██ ██   ██    ██    
// ██   ██ ██   ██ ██   ██ ██   ██    ██    

function array_max(array) { 
    return array.reduce(
        function(a, b) { 
            return Math.max(a, b); 
        }
    ); 
}

function array_min(array) { 
    return array.reduce(
        function(a, b) { 
            return Math.min(a, b); 
        }
    );
}

function cumulative_sum(x) { 
    let sum = 0;
    return x.map(
        (n => sum += n)
    ); 
}

function backward_difference(x, stride = 1) {
    let out = [0];
    const len = x.length;
    for (let i = 1; i < len && i < stride; i++) {
        out.push(x[i] - x[0]);
    }
    for (let i = stride; i < len; i++) {
        out.push(x[i] - x[i-stride]);
    }
    return out;
}

// ███████ ████████ ██████  ██ ███    ██  ██████  ███████ 
// ██         ██    ██   ██ ██ ████   ██ ██       ██      
// ███████    ██    ██████  ██ ██ ██  ██ ██   ███ ███████ 
//      ██    ██    ██   ██ ██ ██  ██ ██ ██    ██      ██ 
// ███████    ██    ██   ██ ██ ██   ████  ██████  ███████ 
                                                       
function to_ascii(s) {
    return s.replaceAll("[^\\p{ASCII}]");
}

function to_id_name(s) {
    // .replaceAll(/ /g, "_") // replace space with _
    let t = s.replace(/[\])}[{(]/g, ""); // remove brackets, parens, braces
    let a = t.split(' ')
    const first = parseInt(a[0]);
    if (!isNaN(first)) {
        a[0] = num_to_words(first);
        a[0] = a[0].charAt(0).toUpperCase() + a[0].slice(1);
    }
    t = a.join('_'); // effectively replaces space with _
    return t;
}

// ████████ ██ ███    ███ ███████ 
//    ██    ██ ████  ████ ██      
//    ██    ██ ██ ████ ██ █████   
//    ██    ██ ██  ██  ██ ██      
//    ██    ██ ██      ██ ███████ 

const short_month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function treat_as_UTC(date) {
    let result = new Date(date);
    result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
    return result;
}

function days_between(startDate, endDate) {
    let millisecondsPerDay = 24 * 60 * 60 * 1000;
    return (treat_as_UTC(endDate) - treat_as_UTC(startDate)) / millisecondsPerDay;
}

function days_in_domain(domain) {
    return days_between(domain[0], domain[1]);
}

//  ██████  ██████  ██    ██ ███    ██ ████████ 
// ██      ██    ██ ██    ██ ████   ██    ██    
// ██      ██    ██ ██    ██ ██ ██  ██    ██    
// ██      ██    ██ ██    ██ ██  ██ ██    ██    
//  ██████  ██████   ██████  ██   ████    ██    

/* 
Usage:
    console.log( count("apple") );          // 1
    console.log( count("apple") );          // 2
    console.log( count("apple", false) );   // 2
    console.log( count("apple") );          // 3
    console.log( count("banana") );         // 1
Courtesy of https://stackoverflow.com/questions/29775761/way-to-save-console-count-as-an-integer
*/
let count = (
    function() {
        let counter = {};
        return function(v, update = true) {
            return (counter[v] = (counter[v] || 0) + ((update) ? 1 : 0));
        };
    }()
);

//  ██████  ██████       ██ ███████  ██████ ████████ ███████ 
// ██    ██ ██   ██      ██ ██      ██         ██    ██      
// ██    ██ ██████       ██ █████   ██         ██    ███████ 
// ██    ██ ██   ██ ██   ██ ██      ██         ██         ██ 
//  ██████  ██████   █████  ███████  ██████    ██    ███████ 

// https://stackoverflow.com/questions/24032654/how-can-i-check-if-two-javascript-objects-have-the-same-fields
function has_all_properties(subItem, superItem) {
    // Prevent error from using Object.keys() on non-object
    var subObj = Object(subItem),
        superObj = Object(superItem);

    if (!(subItem && superItem)) { return false; }

    return Object.keys(subObj).every(function (key) {
        return key in superObj;
    });
}
