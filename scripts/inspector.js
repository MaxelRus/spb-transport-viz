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
        mask[current] = false;
        if(mask.reduce((a, b) => a || b) === false){
            d3.selectAll(".bus,.tram,.trol")
                .attr("display", "block");
            d3.selectAll(".t-type")
                .classed("dim", false);
            console.log(d3.selectAll(".t-type"));
            mask = [true, true, true];
        }
        else {
            button.classed("dim", true);
            count.classList.add("dim");
            stops.attr("display", "none");
        }
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
            .style("display", "flex")
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
        d3.selectAll(".cregion")
            .filter(d => d)
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

//Inspector declaration
let iPie = d3.select("#i-pie")
        .attr("viewBox", [-50, -50, 100, 100])
        .attr("preserveAspectRatio", "xLeftYMid meet"),
    iArc = d3.arc()
        .innerRadius(30)
        .outerRadius(50);
let hgWidth = 560,
    hgHeight = 380,
    hgMargin = {top: 20, right: 20, bottom: 50, left: 45};
let hgChart = d3.select("#hg-chart")
    .attr("viewBox", [0, 0, hgWidth, hgHeight])
    .attr("preserveAspectRatio", "xLeftYMid meet");
let hgLegend = hgChart.append("g");
hgLegend.append("text")
    .attr("x", hgWidth)
    .attr("y", hgHeight)
    .attr("dy", -2)
    .attr("text-anchor", "end")
    .attr("fill", "#586366")
    .style("font-size", "1vh")
    .style("font-weight", "700")
    .text("РАССТОЯНИЕ МЕЖДУ ОСТАНОВКАМИ (КМ) →");

//Update inspector
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
        });
    d3.select("#i-routes")
        .transition()
        .duration(150)
        .textTween(function(){
            const i = d3.interpolate(this.innerHTML, data.routes.bus.length
                + data.routes.tram.length
                + data.routes.trol.length);
            return function(t) {return this.innerHTML = i(t).toFixed(0)};
        });
    d3.select("#i-density")
        .transition()
        .duration(150)
        .textTween(function(){
            const i = d3.interpolate(+this.innerHTML.split(" ")[0], data.stopsPerArea.bus
                + data.stopsPerArea.tram
                + data.stopsPerArea.trol);
            return function(t) {return this.innerHTML = i(t).toFixed(3)+ " ост/км²"};
        });

    //Histogram
    let hgExtents = [0, Math.ceil(d3.max([
        ...data.stopsByDistance.bus,
        ...data.stopsByDistance.tram,
        ...data.stopsByDistance.trol])*10)/10
    ];
    let real = hgExtents[1] < 2;
    let hgBins = real ? hgExtents[1] * 8 : 16;
    let thresholds = d3.range(0, real ? hgExtents[1] : 2, (real ? hgExtents[1] : 2)/hgBins);
    if (!real) thresholds.push("2");
    let histogram = d3.histogram()
        .domain(hgExtents)
        .thresholds(thresholds);
    let series = [[],[],[]];
    let hgData = [
        histogram(data.stopsByDistance.bus),
        histogram(data.stopsByDistance.tram),
        histogram(data.stopsByDistance.trol)
    ];
    hgBins = real ? hgExtents[1] * 8 : 17;
    for(let i=0; i<hgBins; i++){
        let base = hgData[0][i].length;
        series[0].push([0, base]);
        series[1].push([base, base = base + hgData[1][i].length]);
        series[2].push([base, base + hgData[2][i].length]);
    }
    console.log(series);
    let x = d3.scaleLinear()
        .domain([0, hgBins])
        .range([hgMargin.left, hgWidth-hgMargin.right]);
    let y = d3.scaleLinear()
        .domain([0, d3.max(series, d => d3.max(d, d => d[1]))])
        .range([hgHeight - hgMargin.bottom, hgMargin.top]);
    let binWidth = 0.95 * (x(1)-x(0));
    //Histogram zoom
    // let extent = [[hgMargin.left, hgMargin.top], [hgWidth-hgMargin.right, hgHeight - hgMargin.top]];
    // const hgZoom = d3.zoom()
    //     .scaleExtent([1, Math.max(hgExtents[1]/1.5, 1)])
    //     .translateExtent(extent)
    //     .extent(extent)
    //     .on("zoom", chartZoomed);

    //Histogram append
    hgChart.selectAll("g")
        .data(series)
        .join("g")
        .attr("class", (d, i) => i === 0 ? "bus" : (i === 1 ? "tram" : "trol"))
        .selectAll("rect")
            .data(d => d)
            .join("rect")
            .transition().duration(150)
            .attr("x", (d, i) => x(i))
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0])-y(d[1]))
            .attr("width", binWidth);
    //thresholds.shift();
    thresholds.push(hgExtents[1]);
    let xAxis = g => g
        .attr("transform", `translate(0,${hgHeight - hgMargin.bottom})`)
        .call(d3.axisBottom(x)
            .tickFormat(d => Math.round(d/8*100)/100))
        .call(g => g.select(".domain").remove())
        .call(g => g.select(".tick:last-of-type text")
            .text(real ? hgExtents[1] : "2<"));
    let yAxis = g => g
        .attr("transform", `translate(${hgMargin.left},0)`)
        .call(d3.axisLeft(y)
            .ticks(5)
            .tickSize(-hgWidth))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick:not(:first-of-type) line")
            .attr("stroke-width", "0.1vh")
            .attr("opacity", 0.2))
        .call(g => g.select(".tick:first-of-type text")
            .text(null));
    hgChart.append("g")
        .attr("class", "hg-axis x")
        .attr("stroke-width", "0.1vh")
        .call(xAxis);
    hgChart.append("g")
        .attr("class", "hg-axis")
        .attr("stroke-width", "0.1vh")
        .call(yAxis);
    hgLegend
        .append("text")
        .attr("x", 0)
        .attr("y", hgHeight)
        .attr("dy", -2)
        .attr("text-anchor", "start")
        .attr("fill", "white")
        .attr("class", "hg-legend-data")
        .style("font-size", "1vh")
        .style("font-weight", "700");
    let hgLegendItem = hgChart.append("g")
        .selectAll(".hg-select")
        .data(series[0])
        .join("g")
        .attr("class","hg-legend-item")
        .attr("opacity", "0")
        .attr("transform", function(d, i) {return "translate("+x(i)+",0)"})
        .on("mouseover", hgLegendOver)
        .on("mouseout", hgLegendOut);
    hgLegendItem.append("rect")
        .attr("x", 0)
        .attr("y", hgMargin.top)
        .attr("height", hgHeight-hgMargin.bottom-hgMargin.top)
        .attr("width", x(1)-x(0))
        .attr("fill", "#2e3336")
        .attr("opacity", ".5");
    function hgLegendOver(d, i){
        hgLegendItem.attr("opacity", "0");
        d3.select(this).attr("opacity", 1);
        hgLegend.select(".hg-legend-data")
            .text("")
            .call(text => text.append("tspan").text(series[2][i][1]+"\xa0\xa0/"))
            .call(text => text.append("tspan").attr("fill", "#48F648").text("\xa0\xa0"+(series[0][i][1]-series[0][i][0])))
            .call(text => text.append("tspan").attr("fill", "#ff3533").text("\xa0\xa0"+(series[1][i][1]-series[1][i][0])))
            .call(text => text.append("tspan").attr("fill", "#2190ff").text("\xa0\xa0"+(series[2][i][1]-series[2][i][0])))
    }
    function hgLegendOut(){
        hgLegendItem.attr("opacity", "0");
        hgLegend.select(".hg-legend-data").text("");
    }
    // hgChart.call(hgZoom);
    // function chartZoomed() {
    //     x.range([hgMargin.left, hgWidth - hgMargin.right].map(d => d3.event.transform.applyX(d)));
    //     binWidth = 0.9 * (x(1)-x(0));
    //     hgChart.selectAll("rect").attr("x", (d, i) => x(i%hgBins)).attr("width", binWidth);
    //     hgChart.selectAll(".hg-axis.x").call(xAxis);
    // }
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
let chToggle = d3.selectAll(".ch-toggle").on("click", showChoropleth);
let chLegend = d3.select("#ch-scale")
    .attr("viewBox", [0, 0, 314, 55])
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
        chToggle.classed("active", false);
        d3.selectAll(".ch-legend-item").remove();
        reset();
    }
    else{
        d3.selectAll(".circles").attr("display", "none");
        areas.selectAll(".cregion").remove();
        chToggle.classed("active", false);
        currentSet.classed("active", true);
        reset();
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
        console.log(thresholds);
        let denScheme = ["#CCFBF1","#93f5e9","#6AECEC","#3CD2E2","#10AED6","#097CAF","#045186","#012D5C","#00112F"],
            quantScheme = ["#d9fac8","#b7f5b0","#79f7ae","#62fbbe","#35FFD2","#24CCB1","#17998C","#0C6663","#053333"];
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
            .attr("transform", function(d, i) {return "translate("+i*35+",0)"})
            .on("mouseover", chLegendOver)
            .on("mouseout", chLegendOut);
        function chLegendOver(obj){
            let colorMask = d3.select(this).select("rect").attr("fill");
            d3.selectAll(".ch-legend-item").selectAll("rect")
                .attr("stroke", "none");
            d3.select(this).select("rect")
                .attr("stroke", "white")
                .attr("stroke-width", 2);
            d3.selectAll(".cregion")
                .classed("dim", false)
                .filter(function(d){
                    console.log();
                    return color(type ?
                        d.stopsPerArea.bus + d.stopsPerArea.tram + d.stopsPerArea.trol :
                        d.stopsByQuantity.bus + d.stopsByQuantity.tram + d.stopsByQuantity.trol) !== colorMask;
                })
                .classed("dim", true);
        }
        function chLegendOut(){
            d3.selectAll(".cregion")
                .classed("dim", false);
            d3.selectAll(".ch-legend-item").selectAll("rect")
                .attr("stroke", "none");
        }
        chLegendItem.append("rect")
            .attr("x", 0)
            .attr("y", 2)
            .attr("width", 34)
            .attr("height", 20)
            .attr("fill", function(d, i) {return type? denScheme[i] : quantScheme[i]});
        chLegendItem.append("text")
            .attr("x", 0)
            .attr("y", 36)
            .style("text-anchor", "middle")
            .style("font-size", "0.7vh")
            .style("font-weight", "700")
            .style("fill", "white")
            .text(function(d, i) { return chLegendText[i]; });
        chLegend.append("text")
            .attr("class", "ch-legend-item")
            .attr("x", 314)
            .attr("y", 55)
            .attr("dy", -2)
            .attr("text-anchor", "end")
            .attr("fill", "#586366")
            .style("font-size", "0.56vh")
            .style("font-weight", "700")
            .text(type ? "ОСТАНОВОК/КМ² →" : "КОЛИЧЕСТВО ОСТАНОВОК В РЕГИОНЕ →");
        areas.selectAll(".cregion")
            .data(regionList)
            .join("path")
            .attr( "d", path )
            .raise()
            .attr("class", "cregion")
            .attr("stroke", "white")
            .attr("fill", d => color(type ?
                d.stopsPerArea.bus + d.stopsPerArea.tram + d.stopsPerArea.trol :
                d.stopsByQuantity.bus + d.stopsByQuantity.tram + d.stopsByQuantity.trol)
            )
            .on("mouseover", tooltipOver)
            .on("mousemove", tooltipMove)
            .on("mouseout", tooltipOut);
    }
}
