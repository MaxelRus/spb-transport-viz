//Filter
let mask = [true, true, true];
let tType = d3.selectAll(".t-type")
        .on("click", filterClicked);

function filterClicked(){
    let button = d3.select(this),
        current = button.classed("bus") ? 0 :
            (button.classed("tram") ? 1 : 2),
        count = d3.select("#i-count").selectAll("h3").nodes()[current],
        stops = d3.selectAll(button.classed("bus") ? ".bus" :
            (button.classed("tram") ? ".tram" : ".trol"));
    if(button.classed("dim")){
        button.classed("dim", false);
        count.classList.remove("dim");
        mask[current] = true;
        stops.attr("display", "block");
    }
    else{
        button.classed("dim", true);
        count.classList.add("dim");
        mask[current ] = false;
        stops.attr("display", "none");
    }
    updateInspector(tree.last());
    if (chActive) showChoropleth(true);
}

//Get preprocessed data
function getData(obj){
    let busMask = mask[0],
        tramMask = mask[1],
        trolMask = mask[2];
    let output = {
        stopsByDistance: {bus:[],tram:[],trol:[]},
        stopsByQuantity: {bus:0,tram:0,trol:0},
        stopsPerArea: {bus:0,tram:0,trol:0},
        routes: {bus:[],tram:[],trol:[]}
    };
    let routeCount = [new Set, new Set, new Set];
    switch (obj.otype) {
        case 2:
            if (busMask) {
                output.stopsByDistance.bus = obj.stopsByDistance.bus;
                output.stopsByQuantity.bus = obj.stopsByQuantity.bus;
                output.stopsPerArea.bus = obj.stopsPerArea.bus;
                output.routes.bus = obj.routes.bus;
            }
            if (tramMask) {
                output.stopsByDistance.tram = obj.stopsByDistance.tram;
                output.stopsByQuantity.tram = obj.stopsByQuantity.tram;
                output.stopsPerArea.tram = obj.stopsPerArea.tram;
                output.routes.tram = obj.routes.tram;
            }
            if (trolMask) {
                output.stopsByDistance.trol = obj.stopsByDistance.trol;
                output.stopsByQuantity.trol = obj.stopsByQuantity.trol;
                output.stopsPerArea.trol = obj.stopsPerArea.trol;
                output.routes.trol = obj.routes.trol;
            }
            break;
        case 1:
            let districtArea = d3.geoArea(obj) / 12.56637 * 510072000;
            for (region of obj.regions) {
                if (busMask) {
                    output.stopsByDistance.bus = [...output.stopsByDistance.bus, ...region.stopsByDistance.bus];
                    output.stopsByQuantity.bus += region.stopsByQuantity.bus;
                    region.routes.bus.forEach(d => routeCount[0].add(d));
                }
                if (tramMask) {
                    output.stopsByDistance.tram = [...output.stopsByDistance.tram, ...region.stopsByDistance.tram];
                    output.stopsByQuantity.tram += region.stopsByQuantity.tram;
                    region.routes.tram.forEach(d => routeCount[0].add(d));
                }
                if (trolMask) {
                    output.stopsByDistance.trol = [...output.stopsByDistance.trol, ...region.stopsByDistance.trol];
                    output.stopsByQuantity.trol += region.stopsByQuantity.trol;
                    region.routes.trol.forEach(d => routeCount[0].add(d));
                }
            }
            output.stopsPerArea = {
                bus: output.stopsByQuantity.bus / districtArea,
                tram: output.stopsByQuantity.tram / districtArea,
                trol: output.stopsByQuantity.trol / districtArea
            };
            output.routes = {
                bus: Array.from(routeCount[0]),
                tram: Array.from(routeCount[1]),
                trol: Array.from(routeCount[2])
            };
            break;
        case 0:
            let cityArea = 0;
            for (district of obj.districts) {
                for (region of district.regions) {
                    if (busMask) {
                        output.stopsByDistance.bus = [...output.stopsByDistance.bus, ...region.stopsByDistance.bus];
                        output.stopsByQuantity.bus += region.stopsByQuantity.bus;
                        region.routes.bus.forEach(d => routeCount[0].add(d));
                    }
                    if (tramMask) {
                        output.stopsByDistance.tram = [...output.stopsByDistance.tram, ...region.stopsByDistance.tram];
                        output.stopsByQuantity.tram += region.stopsByQuantity.tram;
                        region.routes.tram.forEach(d => routeCount[0].add(d));
                    }
                    if (trolMask) {
                        output.stopsByDistance.trol = [...output.stopsByDistance.trol, ...region.stopsByDistance.trol];
                        output.stopsByQuantity.trol += region.stopsByQuantity.trol;
                        region.routes.trol.forEach(d => routeCount[0].add(d));
                    }
                }
                cityArea += d3.geoArea(district);
            }
            cityArea = cityArea / 12.56637 * 510072000;
            output.stopsPerArea = {
                bus: output.stopsByQuantity.bus / cityArea,
                tram: output.stopsByQuantity.tram / cityArea,
                trol: output.stopsByQuantity.trol / cityArea
            };
            output.routes = {
                bus: Array.from(routeCount[0]),
                tram: Array.from(routeCount[1]),
                trol: Array.from(routeCount[2])
            };
            break;
    }
    return output;
}

//Tooltip
let tooltip = d3.select("#tooltip");
let ttPie = d3.select("#tt-pie")
    .attr("viewBox", [-50, -50, 100, 100])
    .attr("preserveAspectRatio", "xLeftYMid meet"),
    ttArc = d3.arc()
        .innerRadius(30)
        .outerRadius(50);
let pie = d3.pie().sort(null).value(d => d.value);
function tooltipOver(obj){
    if(chActive){
        let data = getData(obj);
        let type = currentSet.text() === "По плотности";
        let city = getData(atlas),
            avg = type ?
                city.stopsPerArea.bus +
                city.stopsPerArea.tram +
                city.stopsPerArea.trol
                : chMean,
            current = type ?
                data.stopsPerArea.bus +
                data.stopsPerArea.tram +
                data.stopsPerArea.trol
                : data.stopsByQuantity.bus
                + data.stopsByQuantity.tram
                + data.stopsByQuantity.trol;
        d3.select("#tt-name")
            .text(obj.name);
        d3.select("#tt-type")
            .text(obj.otype === 1 ? "РАЙОН" :
                (obj.otype === 2 ? "ОКРУГ" : "ОСТАНОВКА"));
        d3.select("#tt-info")
            .selectAll("h2")
            .nodes()[0]
            .innerText = type ? "ПЛОТНОСТЬ" : "ОСТАНОВОК";
        d3.select("#tt-info")
            .selectAll("h2")
            .nodes()[1]
            .innerText = "ОТ СРЕДНЕГО";
        let ttPieData = d3.entries({part: 1});
        ttPie.selectAll("path")
            .data(pie(ttPieData))
            .join("path")
            .attr("class", "")
            .attr("fill", d => current/avg > 1 ? "#3acd3a" : "#cd3230")
            .attr("d", ttArc);
        d3.select("#tt-stops")
            .text(type ?
                (data.stopsPerArea.bus +
                data.stopsPerArea.tram +
                data.stopsPerArea.trol).toFixed(3)
                : data.stopsByQuantity.bus
                + data.stopsByQuantity.tram
                + data.stopsByQuantity.trol);
        d3.select("#tt-routes").text(((current/avg-1)*100).toFixed(1)+"%");
    }
    else {
        if(tree.last().otype > obj.otype) {
            d3.select("#tt-name")
                .text("На уровень выше (ESC)");
            d3.select("#tt-info")
                .style("display", "none");
        }
        else{
            let data = getData(obj);
            d3.select("#tt-info")
                .selectAll("h2")
                .nodes()[0]
                .innerText = "ОСТАНОВОК";
            d3.select("#tt-info")
                .selectAll("h2")
                .nodes()[1]
                .innerText = "МАРШРУТОВ";
            d3.select("#tt-info")
                .style("display", "flex");
            d3.select("#tt-name")
                .text(obj.name);
            d3.select("#tt-type")
                .text(obj.otype === 1 ? "РАЙОН" :
                    (obj.otype === 2 ? "ОКРУГ" : "ОСТАНОВКА"));
            if(obj.otype !== 3) {
                let ttPieData = d3.entries(data.stopsByQuantity);
                ttPie.selectAll("path")
                    .data(pie(ttPieData))
                    .join("path")
                    .attr("class", function (d) {
                        return d.data.key
                    })
                    .attr("d", ttArc);
                d3.select("#tt-stops")
                    .text(data.stopsByQuantity.bus
                        + data.stopsByQuantity.tram
                        + data.stopsByQuantity.trol);
                d3.select("#tt-routes")
                    .text(data.routes.bus.length
                        + data.routes.tram.length
                        + data.routes.trol.length);
                if (tree.last().otype <= obj.otype)
                    d3.select(this)
                        .classed("hover", true);
            }
        }
    }
}
function tooltipMove(obj){
    tooltip.style("left", (event.pageX) + "px")
        .style("top", (event.pageY) + "px")
        .classed("active", true);
}
function tooltipOut(obj){
    tooltip.classed("active", false);
    d3.select(this)
        .classed("hover", false);
}

//Inspector
let inspector = d3.select("#inspector");
let iPie = d3.select("#i-pie")
        .attr("viewBox", [-50, -50, 100, 100])
        .attr("preserveAspectRatio", "xLeftYMid meet"),
    iArc = d3.arc()
        .innerRadius(30)
        .outerRadius(50);
function updateInspector(obj) {
    let data = getData(obj);
    d3.select("#name")
        .text(tree.last().name);
    d3.select("#path-name")
        .text(tree.length === 1 ? "Россия" : tree[tree.length-2].name);
    if(obj.otype !== 3) {
        let iPieData = d3.entries(getData(obj).stopsByQuantity);
        iPie.selectAll("path")
            .data(pie(iPieData))
            .join("path")
            .attr("class", function (d) {return d.data.key})
            .attr("d", iArc);
    }
    d3.select("#i-count")
        .selectAll("h3")
        .each(function(d, i) {
            d3.select(this)
                .text(i === 0 ? data.stopsByQuantity.bus :
                    (i === 1 ? data.stopsByQuantity.tram : data.stopsByQuantity.trol));
        });
    d3.select("#i-stops")
        .transition()
        .duration(150)
        .textTween(function(){
            const i = d3.interpolate(this.innerHTML, data.stopsByQuantity.bus
                + data.stopsByQuantity.tram
                + data.stopsByQuantity.trol);
            return function(t) {return this.innerHTML = i(t).toFixed(0)};
        })
    d3.select("#i-routes")
        .transition()
        .duration(150)
        .textTween(function(){
            const i = d3.interpolate(this.innerHTML, data.routes.bus.length
                + data.routes.tram.length
                + data.routes.trol.length);
            return function(t) {return this.innerHTML = i(t).toFixed(0)};
        })
    d3.select("#i-density")
        .transition()
        .duration(150)
        .textTween(function(){
            const i = d3.interpolate(+this.innerHTML.split(" ")[0], data.stopsPerArea.bus
                + data.stopsPerArea.tram
                + data.stopsPerArea.trol);
            return function(t) {return this.innerHTML = i(t).toFixed(3)+ " ост/км²"};
        })

    //Histogram
    let hgChart = d3.select("#hg-chart")
            .attr("viewBox", [0, 0, 560, 320])
            .attr("preserveAspectRatio", "xLeftYMid meet"),
        margin = {top: 10, right: 30, bottom: 30, left: 40},
        hgWidth = 560-margin.right-margin.left,
        hgHeight = 320-margin.bottom-margin.top;
    let maxDistance = d3.max([...data.stopsByDistance.bus, ...data.stopsByDistance.tram, ...data.stopsByDistance.trol]);
    let x = d3.scaleLinear()
        .domain([0, maxDistance])
        .range([0, width]);
    let histogram = d3.histogram()
        .value()
        .domain(x.domain())
        .thresholds(x.ticks(30));
}
//Display level
let tfSlider = document.getElementById("tf-slider"),
    tfValue = d3.select("#tf-value");
tfSlider.oninput = function(){
    stopsDisplay(this.value);
    tfValue.text(this.value+"≤");
};
function stopsDisplay(level){
    if(!chActive){
        d3.selectAll(".circles")
            .attr("display", "none")
            .filter(function() {
                let current = d3.select(this);
                return current.attr("threshold") >= level &&
                    (current.classed("bus") ? mask[0] : true) &&
                    (current.classed("tram") ? mask[1] : true) &&
                    (current.classed("trol") ? mask[2] : true);
            })
            .attr("display", "visible");
    }
}

//Choropleth
let toggle = d3.selectAll(".ch-toggle").on("click", showChoropleth);
let chLegend = d3.select("#ch-scale")
    .attr("viewBox", [0, 0, 314, 40])
    .attr("preserveAspectRatio", "xLeftYMid meet");
let currentSet, chMean,
    chActive = false;
function showChoropleth(update){
    if(!update)
        currentSet = d3.select(this);
    if(!update && currentSet.classed("active")){
        chActive = false;
        stopsDisplay(tfSlider.value);
        areas.selectAll(".cregion").remove();
        toggle.classed("active", false);
        if(tree.last().otype - tree.length === 1) tree.pop();
    }
    else{
        d3.selectAll(".circles").attr("display", "none");
        areas.selectAll(".cregion").remove();
        toggle.classed("active", false);
        currentSet.classed("active", true);
        chActive = true;
        let type = currentSet.text() === "По плотности";
        let regionList = [],
            dataList = [];
        for(district of atlas.districts){
            for(region of district.regions){
                let data = getData(region);
                regionList.push(region);
                if (type) dataList.push(data.stopsPerArea.bus + data.stopsPerArea.tram + data.stopsPerArea.trol);
                else dataList.push(data.stopsByQuantity.bus + data.stopsByQuantity.tram + data.stopsByQuantity.trol)
            }
        }
        chMean = d3.mean(dataList);
        let thresholds = ss.ckmeans(dataList, 9).map(v => v.pop());
        let denScheme = ["#CCFBF1","#9AF5EB","#6AECEC","#3CD2E2","#10AED6","#097CAF","#045186","#012D5C","#00112F"],
            quantScheme = ["#DBFBDD","#B5F9C6","#8CF9BB","#62FBBE","#35FFD2","#24CCB1","#17998C","#0C6663","#053333"];
        let color = d3.scaleThreshold()
                .domain(thresholds)
                .range(type ? denScheme : quantScheme);
        chLegend.selectAll(".ch-legend-item").remove();
        let chLegendText = [""].concat(thresholds.map(i => Math.ceil(i*10)/10));
        chLegendText.pop();
        let chLegendItem = chLegend.selectAll(".ch-legend-item")
            .data(thresholds)
            .join("g")
            .attr("class","ch-legend-item")
            .attr("transform", function(d, i) {return "translate("+i*35+",0)";});
        chLegendItem.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 34)
            .attr("height", 20)
            .attr("fill", function(d, i) {return type? denScheme[i] : quantScheme[i]});
        chLegendItem.append("text")
            .attr("x", 0)
            .attr("y", 36)
            .style("text-anchor", "middle")
            .style("font-size", "0.8vh")
            .style("font-weight", "700")
            .style("fill", "white")
            .text(function(d, i) { return chLegendText[i]; });
        areas.selectAll(".cregion")
            .data(regionList)
            .join("path")
            .attr( "d", path )
            .raise()
            .attr("class", "cregion")
            .attr("stroke", "#10AED6")
            .attr("fill", d => color(type ?
                (mask[0] ? d.stopsPerArea.bus : 0 +
                mask[1] ? d.stopsPerArea.tram : 0 +
                mask[2] ? d.stopsPerArea.trol : 0)
                : (mask[0] ? d.stopsByQuantity.bus : 0 +
                mask[1] ? d.stopsByQuantity.tram : 0 +
                mask[2] ? d.stopsByQuantity.trol : 0)))
            .on("click", lockOn)
            .on("mouseover", tooltipOver)
            .on("mousemove", tooltipMove)
            .on("mouseout", tooltipOut);
    }
}

