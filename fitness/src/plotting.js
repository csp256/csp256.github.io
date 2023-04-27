"use strict";
// ███████ ██   ██ ████████ ███████ ███    ██ ██████      ██████  ██       ██████  ████████ 
// ██       ██ ██     ██    ██      ████   ██ ██   ██     ██   ██ ██      ██    ██    ██    
// █████     ███      ██    █████   ██ ██  ██ ██   ██     ██████  ██      ██    ██    ██    
// ██       ██ ██     ██    ██      ██  ██ ██ ██   ██     ██      ██      ██    ██    ██    
// ███████ ██   ██    ██    ███████ ██   ████ ██████      ██      ███████  ██████     ██    

function extend_timeseries_plot(plot) {
    plot.toggle_last = function() {
        this.toggle(this.external.config.userconfig.last_field_added);
        return this;
    }
}

// ███████ ██   ██ ████████ ███████ ███    ██ ██████       ██████  ██████  ███    ██ ███████ ██  ██████  
// ██       ██ ██     ██    ██      ████   ██ ██   ██     ██      ██    ██ ████   ██ ██      ██ ██       
// █████     ███      ██    █████   ██ ██  ██ ██   ██     ██      ██    ██ ██ ██  ██ █████   ██ ██   ███ 
// ██       ██ ██     ██    ██      ██  ██ ██ ██   ██     ██      ██    ██ ██  ██ ██ ██      ██ ██    ██ 
// ███████ ██   ██    ██    ███████ ██   ████ ██████       ██████  ██████  ██   ████ ██      ██  ██████  

function extend_timeseries_config(obj) {
    obj.fields = []

    obj.userconfig = {
        type: "",
        sma_type: "",
        last_field_added: "",
    }

    let get_default_add_options = function() { 
        return {
            smoothing: 7,
            type: "scatter",
            sma_type: "area"
        };
    }

    const get_options = function(specified_options) {
        let default_add_options = get_default_add_options();
        if (false == has_all_properties(specified_options, default_add_options)) {
            console.warn("specified_options is bad; contains properties not in default");
            console.warn(specified_options);
        };

        if (obj.userconfig.type != "") {
            default_add_options.type = obj.userconfig.type;
        }
        if (obj.userconfig.sma_type != "") {
            default_add_options.sma_type = obj.userconfig.sma_type;
        }

        return Object.assign({...default_add_options}, specified_options);
    }

    obj.add = function(field, specified_options = {}) {
        const options = get_options(specified_options);

        this.userconfig.last_field_added = field;
        if (obj.title.text === "") {
            obj.title.text = field;
        }

        if (obj.bindto == "") {
            obj.bindto = "#" + to_id_name(String(field));
        }

        obj.data.columns.push( [field, ...obj.userdata[field]] );
        obj.fields.push(field);
        obj.data.types[field] = options.type;

        if (0 < options.smoothing) {
            const field_sma = add_sma(obj.userdata, field, options.smoothing);
            obj.data.columns.push( [field_sma, ...obj.userdata[field_sma]] );
            obj.fields.push(field_sma);
            obj.data.types[field_sma] = options.sma_type;
            this.userconfig.last_field_added = field_sma;
        }
        return this;
    }

    obj.add_cumulative = function(input_field) {
        this.add(
            add_cumulative_sum(obj.userdata, input_field), 
            {
                smoothing: 0, 
                type:"area"
            }
        );
        return this;
    }

    obj.group_together = function() {
        this.data.groups = [this.fields];
        return this;
    }

    obj.rescale = function(b = true) {
        this.zoom.rescale = true;
        return this;
    }

    obj.set_title = function(t) {
        obj.title.text = t;
        if (this.bindto == "") {
            this.set_bindto_from_title();
        }
        return this;
    }

    obj.y_min_pad = function(dy) {
        obj.axis.y.min = array_min(obj.userdata[obj.title.text]) - dy;
        return this;
    }

    obj.y_max_pad = function(dy) {
        obj.axis.y.max = array_max(obj.userdata[obj.title.text]) + dy;
        return this;
    }
    
    obj.y_pad = function(dy) {
        this.y_min_pad(dy);
        this.y_max_pad(dy);
        return this;
    }


    obj.set_type = function(type) {
        this.userconfig.type = type;
        return this;        
    }

    obj.set_sma_type = function(type) {
        this.userconfig.sma_type = type;
        return this;
    }

    obj.append_bindto = function(s) {
        this.bindto += s;
        return this;
    }
    obj.set_bindto = function(target) {
        this.bindto = target;
        return this;
    }

    obj.set_bindto_from_title = function() {
        this.bindto = "#" + to_id_name(this.title.text);
        console.log(this.bindto)
        return this;
    }

    obj.done = function() {
        let c = bb.generate(this);
        charts[obj.title.text] = c;

        c.external = {};
        c.external.config = this;
        c.external.userconfig = this.userconfig;
        c.external.userdata = this.userdata;

        extend_timeseries_plot(c)

        return c;
    }

    return obj;
}

//  ██████  ██████  ███    ██ ███████ ██  ██████      ██████  ██       ██████  ████████ 
// ██      ██    ██ ████   ██ ██      ██ ██           ██   ██ ██      ██    ██    ██    
// ██      ██    ██ ██ ██  ██ █████   ██ ██   ███     ██████  ██      ██    ██    ██    
// ██      ██    ██ ██  ██ ██ ██      ██ ██    ██     ██      ██      ██    ██    ██    
//  ██████  ██████  ██   ████ ██      ██  ██████      ██      ███████  ██████     ██    

function config_plot(data, type = "timeseries") {
    let obj = {};
    if (type !== "timeseries") {
        return obj;
    }

    obj.userdata = data;

    obj.clipPath = true;

    obj.data = {
        x: "x",
        columns: [
            ["x", ...data["Date"]]
        ],
        types: {}
    };

    obj.bindto = "";

    const y_formatter = function(x) { 
        return (1000 <= x) 
            ? ((x/1000.0).toLocaleString() + "k")
            : x.toLocaleString(); 
    };

    obj.axis = {
        x: {
            type: "timeseries",
            tick: {
                centered: true,
                fit: false,
                count: 8,
                multiline: false,
                autorotate: true,
                rotate: 90,
                format: function(d) {
                    return short_month_names[d.getMonth()] + " " + d.getDate();
                },
                culling: false,
                outer: false,
                values: data["Date"],
            },
        },
        y: {
            tick: {
                outer: false,
                format: y_formatter
            },
            padding: {
                top: 10,
                bottom: 10
            }
        },
        y2: {
            tick: {
                outer: false,
                format: y_formatter
            },
            show: true,
        }
    };

    obj.scatter = {zerobased:true};
    obj.line = {zerobased:true};

    obj.grid = {
        focus: {
            show: true,
            y: true,
            edge: true
        },
        y: {
            lines: [
                {
                    value: 0,
                    text: ""
                },
            ],
            show: true
        }
    };

    obj.zoom = {
        enabled: true,
        type: "drag",
        rescale: false,
    };

    obj.padding = true;

    obj.title = {
        text: "",
        padding: {
            top: 20,
            bottom: 5
        }
    };

    obj.tooltip = {
        order: null,
        grouped: true,
        format: {
            title: function(d) { 
                return d.toLocaleDateString(
                    undefined, 
                    { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    }
                );
            },
            value: function(value, ratio, id) { 
                return value.toLocaleString(
                    undefined, 
                    { 
                        maximumFractionDigits: 1 
                    }
                ); 
            }
        }
    };

    obj.onrendered = function() {
        const domain = this.internal.zoom.getDomain();
        const days = days_in_domain(domain);

        const tick_count = Math.max(2, Math.floor((document.body.clientWidth - 80) / 18));

        const stride = Math.ceil(days / tick_count);

        // find first and last valid date (yes this is janky as hell)
        const len = this.internal.axis.x.config.tickValues.length;
        let i = 0;
        let first = 0;
        for (; i < len; i++) {
            if (domain[0] <= this.internal.axis.x.config.tickValues[i]) {
                first = i;
                break;
            }
        }
        let last = Math.min(i, len-1);
        for (; i < len; i++) {
            if (domain[1] < this.internal.axis.x.config.tickValues[i]) {
                break;
            }
            last = i;
        }
        last = Math.max(1, last);

        // Without this offset we have a tendency for wasted padding on left or right
        const offset = Math.ceil(((last) % stride) / 2);

        d3.selectAll(this.internal.config.bindto + " .bb-axis-x .tick tspan").each(
            function(v) {
                if (first <= v.index && v.index <= last) {
                    this.textContent = ((v.index % stride) == offset) 
                        ? v.splitted
                        : "";
                } else {
                    this.textContent = "";
                }
            }
        );
    }

    return extend_timeseries_config(obj);
}

// ██      ███████  ██████   █████   ██████ ██    ██         
// ██      ██      ██       ██   ██ ██       ██  ██          
// ██      █████   ██   ███ ███████ ██        ████           
// ██      ██      ██    ██ ██   ██ ██         ██            
// ███████ ███████  ██████  ██   ██  ██████    ██            
                                                          
                                                          
// ██████  ███████ ███████  █████  ██    ██ ██      ████████ 
// ██   ██ ██      ██      ██   ██ ██    ██ ██         ██    
// ██   ██ █████   █████   ███████ ██    ██ ██         ██    
// ██   ██ ██      ██      ██   ██ ██    ██ ██         ██    
// ██████  ███████ ██      ██   ██  ██████  ███████    ██    
                                                          
function plot_obj_set_options(obj, data) {
    obj.clipPath = true;
    obj.axis = {
        x: {
            type: "timeseries",
            tick: {
                centered: true,
                fit: false,
                count: 8,
                multiline: false,
                autorotate: true,
                rotate: 90,
                format: function(d) {
                    return short_month_names[d.getMonth()] + " " + d.getDate();
                },
                culling: false,
                outer: false,
                values: data["Date"],
            },
        },
        y: {
            tick: {
                outer: false,
                format: function(s) { return s.toLocaleString(); }
            },
            padding: {
                top: 10,
                bottom: 10
            }
        },
        y2: {
            tick: {
                outer: false,
                format: function(s) { return s.toLocaleString(); }
            },
            show: true,
        }
    };

    obj.scatter = {zerobased:true};
    obj.line = {zerobased:true};

    obj.grid = {
        focus: {
            show: true,
            y: true,
            edge: true
        },
        y: {
            lines: [
                {
                    value: 0,
                    text: ""
                },
            ],
            show: true
        }
    };

    obj.zoom = {
        enabled: true,
        type: "drag",
        rescale: false,
    };

    obj.onrendered = function() {
        const domain = this.internal.zoom.getDomain();
        const days = days_in_domain(domain);

        const tick_count = Math.max(2, Math.floor((document.body.clientWidth - 80) / 18));

        const stride = Math.ceil(days / tick_count);

        // find first and last valid date (yes this is janky as hell)
        const len = this.internal.axis.x.config.tickValues.length;
        let i = 0;
        let first = 0;
        for (; i < len; i++) {
            if (domain[0] <= this.internal.axis.x.config.tickValues[i]) {
                first = i;
                break;
            }
        }
        let last = Math.min(i, len-1);
        for (; i < len; i++) {
            if (domain[1] < this.internal.axis.x.config.tickValues[i]) {
                break;
            }
            last = i;
        }
        last = Math.max(1, last);

        // Without this offset we have a tendency for wasted padding on left or right
        const offset = Math.ceil(((last) % stride) / 2);

        d3.selectAll(this.internal.config.bindto + " .bb-axis-x .tick tspan").each(
            function(v) {
                if (first <= v.index && v.index <= last) {
                    this.textContent = ((v.index % stride) == offset) 
                        ? v.splitted
                        : "";
                } else {
                    this.textContent = "";
                }
            }
        );
    }

    obj.padding = true;

    obj.title.padding = {
        top:20,
        bottom:5
    };

    obj.tooltip = {
        order: null,
        grouped: true,
        format: {
            title: function(d) { 
                return d.toLocaleDateString(
                    undefined, 
                    { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    }
                );
            },
            value: function(value, ratio, id) { 
                return value.toLocaleString(
                    undefined, 
                    { 
                        maximumFractionDigits: 1 
                    }
                ); 
            }
        }
    };
}

// ██████  ██       ██████  ████████ ████████ ███████ ██████  ███████ 
// ██   ██ ██      ██    ██    ██       ██    ██      ██   ██ ██      
// ██████  ██      ██    ██    ██       ██    █████   ██████  ███████ 
// ██      ██      ██    ██    ██       ██    ██      ██   ██      ██ 
// ██      ███████  ██████     ██       ██    ███████ ██   ██ ███████ 

function plot_obj_observed_v_expected(data, fields, title, bindto) {
    let fields_sma = [...fields].map(el => { return add_sma(data, el) });

    let obj = {
        title: {
            text: title
        },
        data: {
            x: "x",
            columns: [
                [fields[0], ...data[fields[0]]],
                [fields_sma[0], ...data[fields_sma[0]]],
                [fields[1], ...data[fields[1]]],
                [fields_sma[1], ...data[fields_sma[1]]],
                ["x", ...data["Date"]]
            ],
            types: {},
            colors: {}
        },
        bindto: bindto,
    };
    plot_obj_set_options(obj, data);

    obj.data.types[fields[0]] = "scatter";
    obj.data.types[fields_sma[0]] = "area";
    obj.data.types[fields[1]] = "scatter";
    obj.data.types[fields_sma[1]] = "area";

    return obj;
} // plot_obj_observed_v_expected

function plot_obj_tdee(data) {
    const name = "TDEE [C]";
    const fields = ["Resting Energy [C]", "Active Energy [C]"];

    let obj = {
        title: {
            text: name
        },
        data: {
            order: null,
            x: "x",
            columns: [
                ["x", ...data["Date"]],
            ],
            type: "bar",
            types: {},
            groups: [fields],
        },
        bindto: "#" + to_id_name(name),
    };
    plot_obj_set_options(obj, data);

    for (let field of fields) {
        obj.data.columns.push( [field, ...data[field]] );    
    }

    let sum = hadamard_sum([data["Resting Energy [C]"], data["Active Energy [C]"]]);
    const sma = simple_moving_average(sum, 7);
    const sma_name = name + " (SMA 7)";
    obj.data.columns.push( [name, ...sum]);
    obj.data.columns.push( [sma_name, ...sma]);
    obj.data.types[name] = "scatter";
    obj.data.types[sma_name] = "area";

    return obj;
} // plot_obj_tdee

// ██    ██ ██████  ██████   █████  ████████ ███████ 
// ██    ██ ██   ██ ██   ██ ██   ██    ██    ██      
// ██    ██ ██████  ██   ██ ███████    ██    █████   
// ██    ██ ██      ██   ██ ██   ██    ██    ██      
//  ██████  ██      ██████  ██   ██    ██    ███████ 

// rename this and break this up

function update(results) {
    const raw_data = transpose(results);
    const data = compute_derived(raw_data);
    d = data;

    { // Weight
        config_plot(data).add("Weight [lbs]").y_min_pad(5).done();
        config_plot(data).add("1 Day Delta of Weight [lbs]").done();
        config_plot(data).add("7 Day Delta of Weight [lbs]").done();
        config_plot(data).add("30 Day Delta of Weight [lbs]").done();

        config_plot(data)
            .set_title("Cumulative Active Weight Change [lbs]")
            .add_cumulative("Active Weight Change [lbs]")
            .add("Cumulative Dietary Weight Change [lbs]", {smoothing:0, type:"area"})
            .group_together()
            .rescale()
            .done();
    }

    { // Nutrition
        config_plot(data).add("Protein [g]").done();
        config_plot(data).add("Fat [g]").done();
        config_plot(data).add("Carbs [g]").done();
    }

    { // Exercise 
        config_plot(data).add("Walking [Steps]").done();
        config_plot(data).add("Walking [mi]").done();
        config_plot(data).add_cumulative("Walking [mi]").done();
    }

    { // Calories
        config_plot(data)
            .set_title("Daily Calories [C]")
            .set_bindto_from_title()
            .set_type("bar")
            .add("Resting Energy [C]", { smoothing: 0 })
            .add("Active Energy [C]", { smoothing: 0 })
            .add("Food Energy [C]", { smoothing: 0 })
            .group_together()
            .done();

        config_plot(data).add("Deficit [C]").done();
        config_plot(data).add("Food Energy [C]").done();

        let tdee = plot_obj_tdee(data);
        bb.generate(tdee).toggle("TDEE [C]");

        config_plot(data).add("Active Energy [C]").done();
        config_plot(data).add("Resting Energy [C]").y_pad(0).done();

        data["Ratio of Active (SMA) to Deficit (SMA)"] = 
            hadamard_quotient(
                data["Active Energy [C] (SMA 7)"],
                data["Deficit [C] (SMA 7)"]
            );
        config_plot(data)
            .set_title("Compare Active to Deficit [C]")
            .set_sma_type("line")
            .add("Active Energy [C]")
            .add("Deficit [C]")
            .add("Ratio of Active (SMA) to Deficit (SMA)", {smoothing:0, type:"area"})
            .set_bindto("#Compare_Active_to_Deficit_C")
            .rescale()
            .done()
            .toggle_last();
    }

    { // Analysis
        let weight_comparison = plot_obj_observed_v_expected(
            data, 
            [
                "Observed Weight Change [lbs]",
                "Expected Weight Change [lbs]"
            ], 
            "Observed & Expected Weight Change [lbs]",
            "#Observed_v_Expected_lbs");
        bb.generate(weight_comparison);

        config_plot(data).add("Anomalous Weight Change [lbs]").done();

        let deficit_comparison = plot_obj_observed_v_expected(
            data, 
            [
                "Deficit [C]",
                "Implied Deficit [C]"
            ],
            "Computed & Implied Deficit [C]", 
            "#Observed_v_Expected_Deficit_C",
            {
                toggle_scatter: true
            }
        );
        let deficit_comparison_plot = bb.generate(deficit_comparison);
        deficit_comparison_plot.toggle("Deficit [C]");
        deficit_comparison_plot.toggle("Implied Deficit [C]");

        config_plot(data).add("Deficit Error [C]", 14).done().toggle("Deficit Error [C]");
    }

    { // Body Indexes
        plot_body_indexes(data);
    }
}

function plot_body_indexes(data) {
    let scalar;
    data["New BMI"] = data["Weight [kg]"].map((
        scalar = 1.0 / Math.pow(data["Height [m]"], 2.5),
        n => n * scalar));

    data["Old BMI"] = data["Weight [kg]"].map((
        scalar = 1.0 / Math.pow(data["Height [m]"], 2),
        n => n * scalar));

    data["Ponderal Index"] = data["Weight [kg]"].map((
        scalar = 1.0 / Math.pow(data["Height [m]"], 3),
        n => n * scalar));

    const spread = 0.5;
    if (count("plot body indexes") === 1) {
        config_plot(data).add("New BMI").y_pad(spread).append_bindto("_").done();
        config_plot(data).add("Old BMI").y_pad(spread).append_bindto("_").done();
        config_plot(data).add("Ponderal Index").y_pad(spread).append_bindto("_").done();
    } else {
        function update_body_index(field) {
            field_sma = add_sma(data, field, 7, true);
            charts[field].config("axis.y.min", array_min(data[field]) - spread, false);
            charts[field].config("axis.y.max", array_max(data[field]) + spread, false);
            // https://naver.github.io/billboard.js/release/latest/doc/Chart.html#load
            charts[field].load( 
                {
                    columns:[
                        [field, ...data[field]],
                        [field_sma, ...data[field_sma]]
                    ],
                    resizeAfter: true
                }
            );
        }
        update_body_index("New BMI");
        update_body_index("Old BMI");
        update_body_index("Ponderal Index");
    }

}