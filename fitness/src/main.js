"use strict";
// ████████ ██████   █████  ███    ██ ███████ ██████   ██████  ███████ ███████ 
//    ██    ██   ██ ██   ██ ████   ██ ██      ██   ██ ██    ██ ██      ██      
//    ██    ██████  ███████ ██ ██  ██ ███████ ██████  ██    ██ ███████ █████   
//    ██    ██   ██ ██   ██ ██  ██ ██      ██ ██      ██    ██      ██ ██      
//    ██    ██   ██ ██   ██ ██   ████ ███████ ██       ██████  ███████ ███████ 
// So-called because of the SoA vs AoS mismatch from CSV parse to what d3 expects.                                                                         

function transpose(data) {
    let output = {};
    let fields = data[0].length;
    // Probably a more JS way of doing this but yolo
    for (let field_id = 0; field_id < fields; field_id++) {
        output[data[0][field_id]] = [];
        // Date is special, handle it differently
        if ("Date" === data[0][field_id]) {
            for (let i = 1; i < data.length; i++) {
                // TODO: This setYear hack will fuck everything up and must be fixed soon
                output[data[0][field_id]].push(new Date(data[i][field_id]).setYear(2023));
            }
        } else {
            for (let i = 1; i < data.length; i++) {
                const datum = parseFloat(
                    // Must remove all commas from string before parsing...
                    data[i][field_id].replace(/\,/g, "")
                );
                output[data[0][field_id]].push(
                    // Replaces NaN with 0
                    datum ? datum : 0
                );
            }
        }
    }

    for (let field of ["Active Energy [C]", "Resting Energy [C]"]) {
        for (let i = 0; i < output[field].length; i++) {
            output[field][i] = -output[field][i];
        }
    }

    // TODO: provide users a better way of inputing this 
    output["Height [m]"] = 1.93; 

    return output;
}

// ██████  ███████ ██████  ██ ██    ██ ███████ ██████  
// ██   ██ ██      ██   ██ ██ ██    ██ ██      ██   ██ 
// ██   ██ █████   ██████  ██ ██    ██ █████   ██   ██ 
// ██   ██ ██      ██   ██ ██  ██  ██  ██      ██   ██ 
// ██████  ███████ ██   ██ ██   ████   ███████ ██████  
                                                    
                                                    
// ██████   █████  ████████  █████                     
// ██   ██ ██   ██    ██    ██   ██                    
// ██   ██ ███████    ██    ███████                    
// ██   ██ ██   ██    ██    ██   ██                    
// ██████  ██   ██    ██    ██   ██                    
                                                    
// All the fields which are functions of the raw data are added here. 
function compute_derived(raw_data) {
    const len = raw_data["Date"].length;
    let data = raw_data;

    let ratio_as_percent = function(a, b) {
        return hadamard_quotient(a, b).map(el => { return el * 100.0; });
    }

    data["Weight [kg]"] = data["Weight [lbs]"].map(n => 0.453592 * n);

    data["Deficit [C]"] = hadamard_sum([
        raw_data["Resting Energy [C]"], 
        raw_data["Active Energy [C]"], 
        raw_data["Food Energy [C]"]
    ]);

    data["TDEE [C]"] = hadamard_sum([
        raw_data["Resting Energy [C]"], 
        raw_data["Active Energy [C]"]]);

    data["Active Weight Change [lbs]"] = [];
    data["Cumulative Active Weight Change [lbs]"] = [];
    data["Cumulative Dietary Weight Change [lbs]"] = [];
    data["Cumulative Weight Change [lbs]"] = [];
    let x_sum = 0;
    for (let i = 0; i < len; i++) {
        const x = data["Active Energy [C]"][i] / 3500.0;
        x_sum += x;
        data["Active Weight Change [lbs]"].push(x);
        data["Cumulative Active Weight Change [lbs]"].push(x_sum);
        const delta_weight = data["Weight [lbs]"][i] - data["Weight [lbs]"][0];
        data["Cumulative Dietary Weight Change [lbs]"].push(delta_weight - x_sum);
        data["Cumulative Weight Change [lbs]"].push(delta_weight);
    }
    data["Cumulative Active Weight Change [%]"] = ratio_as_percent(
            data["Cumulative Active Weight Change [lbs]"], 
            data["Cumulative Weight Change [lbs]"]);

    data["Expected Weight Change [lbs]"] = [];
    add_cumulative_sum(data, "Deficit [C]"); // need this one
    for (let i = 0; i < len; i++) {
        data["Expected Weight Change [lbs]"].push(data["Cumulative Deficit [C]"][i] / 3500.0);
    }

    data["Observed Weight Change [lbs]"] = [];
    for (let i = 0; i < len; i++) {
        data["Observed Weight Change [lbs]"].push(data["Weight [lbs]"][i] - data["Weight [lbs]"][0]);
    }

    data["Implied Deficit [C]"] = [...backward_difference(data["Weight [lbs]"])].map(el => { return el * 3500.0; });

    data["Deficit Error [C]"] = hadamard_difference(data["Deficit [C]"], data["Implied Deficit [C]"]);

    data["Anomalous Weight Change [lbs]"] = [];
    for (let i = 0; i < len; i++) {
        data["Anomalous Weight Change [lbs]"].push(data["Observed Weight Change [lbs]"][i] - data["Expected Weight Change [lbs]"][i]);
    }

    add_day_delta(data, "Weight [lbs]", 1);
    add_day_delta(data, "Weight [lbs]", 7);
    add_day_delta(data, "Weight [lbs]", 30);

    data["7 Day Delta of Weight [%]"] = ratio_as_percent(
            data["7 Day Delta of Weight [lbs]"],
            data["Weight [lbs]"]);  // linearization error is much smaller than measurement noise

    // The effect of sex, age and race on estimating percentage body fat from body mass index: The Heritage Family Study.
    // body_fat_percentage = (1.39 * BMI) + (0.16 * Age) - (10.34 * S) - 9
    // S = 1 for male and 0 for female.

    data["Ratio of Active to Deficit [%]"] = ratio_as_percent(
            data["Active Energy [C]"],
            data["Deficit [C]"]);

    return data;
}

// ██    ██ ██████  ██████   █████  ████████ ███████     ██████   █████  ████████  █████  
// ██    ██ ██   ██ ██   ██ ██   ██    ██    ██          ██   ██ ██   ██    ██    ██   ██ 
// ██    ██ ██████  ██   ██ ███████    ██    █████       ██   ██ ███████    ██    ███████ 
// ██    ██ ██      ██   ██ ██   ██    ██    ██          ██   ██ ██   ██    ██    ██   ██ 
//  ██████  ██      ██████  ██   ██    ██    ███████     ██████  ██   ██    ██    ██   ██ 

function add_day_delta(data, field, days, smoothing) {
    const delta_field = days + " Day Delta of " + field;
    if (typeof data[delta_field] === "undefined") {
        const len = data["Date"].length;
        data[delta_field] = [];
        for (let i = 0; i < days; i++) {
            data[delta_field].push(data[field][i] - data[field][0]);
        }
        for (let i = days; i < len; i++) {
            data[delta_field].push(data[field][i] - data[field][i-days]);
        }
    }
    return delta_field;
}

function add_sma(data, field, smoothing = 7, force = false) {
    const field_sma = field + " (SMA " + smoothing + ")";
    if (force || typeof data[field_sma] === "undefined") {
        data[field_sma] = simple_moving_average(data[field], smoothing);
    }
    return field_sma;
}

function add_cumulative_sum(data, field) {
    const field_cs = "Cumulative " + field;
    if (typeof data[field_cs] === "undefined") {
        data[field_cs] = cumulative_sum(data[field]);
    }
    return field_cs;
}

// ███    ███  █████  ██ ███    ██ 
// ████  ████ ██   ██ ██ ████   ██ 
// ██ ████ ██ ███████ ██ ██ ██  ██ 
// ██  ██  ██ ██   ██ ██ ██  ██ ██ 
// ██      ██ ██   ██ ██ ██   ████ 
                                
function main() {
    const url_params = new URLSearchParams(window.location.search);
    let csv = url_params.get('csv');
    if (csv == null) {
        csv = "Data-Raw.csv";
    } else {
        hide_personal();
    }

    const f = Papa.parse(csv, {
        download: true,
        complete: function(results, file) {
            update(results.data);

            // Draws the first undrawn plot, waits, then recurs until all are drawn.
            const delay_ms = 100;
            let draw_one = () => {
                const keys = Object.keys(charts)
                for (let key of keys) {
                    if (charts[key].drawn !== true) {
                        charts[key].draw_now();
                        setTimeout(draw_one, delay_ms);
                        return;
                    }
                }
            }
            draw_one();
        } 
    });
}
