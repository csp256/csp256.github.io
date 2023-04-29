// ██    ██ ██████  ██████   █████  ████████ ███████ 
// ██    ██ ██   ██ ██   ██ ██   ██    ██    ██      
// ██    ██ ██████  ██   ██ ███████    ██    █████   
// ██    ██ ██      ██   ██ ██   ██    ██    ██      
//  ██████  ██      ██████  ██   ██    ██    ███████ 

// TODO: rename this and break this up
function update(results) {
    const raw_data = transpose(results);
    const data = compute_derived(raw_data);
    d = data;

    { // Weight
        config_plot(data).add("Weight [lbs]").y_min_pad(5).done();
        // TODO: create add() parameter for adding backward_difference
        config_plot(data).add("1 Day Delta of Weight [lbs]").done(); 

        config_plot(data)
            .add("7 Day Delta of Weight [lbs]")
            .add("7 Day Delta of Weight [%]")
            .rescale()
            .toggle_last(2)
            .done()

        config_plot(data).add("30 Day Delta of Weight [lbs]").done();

        config_plot(data)
            .set_title("Cumulative Active Weight Change [lbs]")
            .add_cumulative("Active Weight Change [lbs]")
            .add("Cumulative Dietary Weight Change [lbs]", { smoothing:0, type:"area" })
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

        config_plot(data)
            .set_title("TDEE [C]")
            .add("Resting Energy [C]", { type: "bar", smoothing: 0 })
            .add("Active Energy [C]", { type: "bar", smoothing: 0 })
            .group_together()
            .add("TDEE [C]")
            .toggle("TDEE [C]")
            .done()

        config_plot(data).add("Active Energy [C]").done();
        config_plot(data).add("Resting Energy [C]").y_pad(0).done();

        config_plot(data)
            .set_title("Compare Active to Deficit [C]")
            .set_sma_type("line")
            .add("Active Energy [C]")
            .add("Deficit [C]")
            .add("Ratio of Active to Deficit [%]")
            .set_bindto("#Compare_Active_to_Deficit_C")
            .rescale()
            .toggle_last(2)
            .done();
    }

    { // Analysis
        config_plot(data)
            .set_title("Observed & Expected Weight Change [lbs]")
            .set_bindto("#Observed_v_Expected_lbs")
            .add("Observed Weight Change [lbs]")
            .add("Expected Weight Change [lbs]")
            .done();

        config_plot(data).add("Anomalous Weight Change [lbs]").done();

        config_plot(data)
            .set_title("Computed & Implied Deficit [C]")
            .set_bindto("#Observed_v_Expected_Deficit_C")
            .add("Deficit [C]")
            .add("Implied Deficit [C]")
            .done();

        config_plot(data).add("Deficit Error [C]", { smoothing: 14 }).toggle("Deficit Error [C]").done();
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