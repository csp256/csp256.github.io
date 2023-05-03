"use strict";
// ███████ ██   ██ ████████ ███████ ███    ██ ██████      ██████  ██       ██████  ████████ 
// ██       ██ ██     ██    ██      ████   ██ ██   ██     ██   ██ ██      ██    ██    ██    
// █████     ███      ██    █████   ██ ██  ██ ██   ██     ██████  ██      ██    ██    ██    
// ██       ██ ██     ██    ██      ██  ██ ██ ██   ██     ██      ██      ██    ██    ██    
// ███████ ██   ██    ██    ███████ ██   ████ ██████      ██      ███████  ██████     ██    

function extend_timeseries_plot(plot) {
    plot.draw_now = function() {
        if (this.drawn !== true) {
            this.drawn = true;
            this.flush();
            while (this.external.config._toggle_impl.length) {
                this.toggle(this.external.config._toggle_impl.pop());
            }
        }
        return this;
    }

    plot.kill = function() {
        document.getElementById(this.external.config.bindto.slice(1)).innerHTML = "";
        delete charts[this.external.config.title.text];
        delete bindto_charts[this.external.config.bindto];
    }

    return plot;
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
        field_add_order: [],
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

        this.userconfig.field_add_order.push(field);
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
            this.userconfig.field_add_order.push(field_sma);
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
        this.data.groups = [[...this.fields]];
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
        return this;
    }

    obj.set_zerobased = function(input = true) {
        obj.scatter.zerobased = input;
        obj.line.zerobased = input;
        obj.area.zerobased = input;
        return this;
    }

    obj._toggle_impl = [];
    obj.toggle = function(x) {
        obj._toggle_impl.push(x);
        return this;
    }
    obj.toggle_last = function(n = 1) {
        let fields = obj.userconfig.field_add_order.slice(-n);
        for (let field of fields) {
            this.toggle(field);
        }
        return this;
    }

    obj.done = function() {
        // Makes us get callback for lazy rendering
        window.addEventListener(
            "load",
            (event) => {
                intersection_observer.observe(
                    document.querySelector(this.bindto) 
                );
            },
            false
        );

        if (obj.bindto in bindto_charts) {
            bindto_charts[obj.bindto].kill();
        }
        let c = bb.generate(this);
        charts[obj.title.text] = c;
        bindto_charts[obj.bindto] = c;

        c.external = {};
        c.external.config = this;
        c.external.userconfig = this.userconfig;
        c.external.userdata = this.userdata;

        extend_timeseries_plot(c);

        if (is_safari()) {
            c.draw_now();
        }
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
        order: null,
        x: "x",
        columns: [
            ["x", ...data["Date"]]
        ],
        types: {}
    };

    obj.bindto = "";

    const y_formatter = function(x) { 
        return (x <= -1000 || 1000 <= x) 
            ? ((x/1000.0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + " k")
            : x.toLocaleString(); 
    };

    // TODO: Add way to create % based y_formatter
    // but should probably do this after improving rendering logic, so can rewrite it on demand

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
    obj.area = {};

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

    obj.render = {
        lazy: true,
        observe: false
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