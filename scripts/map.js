var width = 960;
var height = 640;

Array.prototype.last = function (){
    return this[this.length-1];
};

var svg = d3.select("#atlas")
    .attr("viewBox", [0, 0, width, height])
    .attr("preserveAspectRatio", "xLeftYMid meet")
    .on("click", lockOn);

let wrapper = svg.append("g");
let areas = wrapper.append("g").attr("stroke-width", "0.04rem");
let transport = wrapper.append("g");
let projection = d3.geoMercator().translate([width/3.5, height/2]).center([30.1, 59.94]).scale(20000);
let path = d3.geoPath(projection);

let atlas = {name: "Санкт-Петербург", otype: 0, districts: []};
let stops = [];
let routes = [];

// Load data
Promise.all([d3.json("data/topo_reg.json"), d3.json("data/topo.json"), d3.csv("data/transport.csv")]).then((res) =>{
    data = res;

    //Stops and routes builder
    let stoplist = new Set();
    let prevRoute = {id: 0},
        currRoute = -1;
    for (let stop of data[2]) {
        if(stoplist.has(+stop.stop_id)) {
            let current = stops.find(d => d.id === +stop.stop_id);
            current.distances.push(+stop.stop_distance);
            if (!current.routes.includes(+stop.route_id))
                current.routes.push(+stop.route_id);
        }
        else {
            stops.push({
                id: +stop.stop_id,
                otype: 3,
                type: stop.transport_type,
                name: stop.stop_name.toUpperCase(),
                distances: [+stop.stop_distance],
                routes: [+stop.route_id],
                location: stop.coordinates.split(",").reverse(),
                obj: null
            });
            stoplist.add(+stop.stop_id);
        }
        if (+stop.route_id !== prevRoute.id){
            routes.push(prevRoute);
            currRoute++;
            prevRoute = {
                id: +stop.route_id,
                type: stop.transport_type,
                name: stop.route_short_name,
                path: [stop.coordinates.split(",").reverse()]
            };
        }
        else {
            prevRoute.path.push(stop.coordinates.split(",").reverse());
        }
    }
    routes.shift();
    console.log(stoplist, stops, routes);

    //Atlas builder
    for (let district of topojson.feature(data[1], data[1].objects.districts).features){
        let currentDistrict  = {
            type: district.type,
            otype: 1,
            name: district.properties.name,
            geometry: district.geometry,
            regions:[],
        };
        for (let region of topojson.feature(data[0], data[0].objects.regions).features) {
            let currentRegion;
            if (region.properties.district === district.properties.name) {
                currentRegion = {
                    type: region.type,
                    otype: 2,
                    name: region.properties.name,
                    geometry: region.geometry,
                    stops: [],
                    stopsByDistance: {bus:[],tram:[],trol:[]},
                    stopsByQuantity: {bus:0,tram:0,trol:0}
                };
                //Stops assign
                let stopList = [],
                    stopLength = stops.length,
                    i = 0;
                let routeCount = [new Set, new Set, new Set];
                while (i < stopLength){
                    let stop = stops[i];
                    if (d3.geoContains(currentRegion, stop.location)) {
                        let threshold = stop.routes.length;
                        stopList.push(transport.append("circle")
                            .attr("class","circles " +
                                (stop.type === "Автобус" ? "bus" :
                                    (stop.type === "Троллейбус" ? "trol" : "tram")))
                            .attr("cx", function(d) {return projection(stop.location)[0];})
                            .attr("cy", function(d) {return projection(stop.location)[1];})
                            .attr("r", 0.2)
                            .attr("opacity", 1)
                            .attr("threshold", threshold)
                            .node());
                        currentRegion.stops.push(stop);
                        if(stop.type === "Автобус"){
                            currentRegion.stopsByDistance.bus.push(d3.mean(stop.distances));
                            currentRegion.stopsByQuantity.bus++;
                            stop.routes.forEach(d => routeCount[0].add(d));
                        }
                        if(stop.type === "Трамвай"){
                            currentRegion.stopsByDistance.tram.push(d3.mean(stop.distances));
                            currentRegion.stopsByQuantity.tram++;
                            stop.routes.forEach(d => routeCount[1].add(d));
                        }
                        if(stop.type === "Троллейбус"){
                            currentRegion.stopsByDistance.trol.push(d3.mean(stop.distances));
                            currentRegion.stopsByQuantity.trol++;
                            stop.routes.forEach(d => routeCount[2].add(d));
                        }
                        stops.splice(i, 1);
                        stopLength--;
                        i--;
                    }
                    i++;
                }
                let regionArea = d3.geoArea(currentRegion) / 12.56637 * 510072000;
                currentRegion.stopsPerArea = {
                    bus: currentRegion.stopsByQuantity.bus/regionArea,
                    tram: currentRegion.stopsByQuantity.tram/regionArea,
                    trol: currentRegion.stopsByQuantity.trol/regionArea
                };
                currentRegion.routes = {
                    bus: Array.from(routeCount[0]),
                    tram: Array.from(routeCount[1]),
                    trol: Array.from(routeCount[2])
                };
                currentRegion.stops.push(stopList);
                currentDistrict.regions.push(currentRegion);
            }
        }
        atlas.districts.push(currentDistrict);
    }
    console.log(atlas);
    svg.call(zoom);
    areas.selectAll(".district")
        .data(atlas.districts)
        .join("path")
        .attr( "d", path )
        .attr("class", "district")
        .attr("stroke", "#10AED6")
        .on("click", lockOn)
        .on("mouseover", tooltipOver)
        .on("mousemove", tooltipMove)
        .on("mouseout", tooltipOut);
    updateInspector(atlas);
}).catch((errorMessage) => {
    console.log(errorMessage);
});

//Lock on object
let tree = [atlas];
function lockOn(obj) {
    let current = tree.last();
    //Handle svg
    if (this === svg.node()){
        if(current !== atlas)
            if(current.otype === 1){
                areas.selectAll(".region").remove();
                tree.pop();
                current = tree.last();
                atlasStyle(current);
            }
            else if (tree.length !== 2) {
                let prev = tree.pop();
                current = tree.last();
                areaZoomed(current);
                atlasStyle(current, prev);
                updateInspector(current);
                return current;
            }
        reset();
        updateInspector(current);
        return current;
    }
    if(current.otype > 1 && obj.otype < 2 || current === obj) {
        let prev = tree.pop(),
            current = tree.last();
        if(!chActive){
            areaZoomed(current);
            atlasStyle(current, prev, false);
        } else {
            reset();
        }
        updateInspector(current);
    }
    else{
        obj.obj = this;
        //Horizontal selection
        if(current.otype === obj.otype){
            tree.pop();
        }
        if(!chActive) atlasStyle(obj, current);
        tree.push(obj);
        areaZoomed(obj);
        if(obj.otype === 1){
            areas.selectAll(".region")
                .data(obj.regions)
                .join("path")
                .attr( "d", path )
                .attr("class", "region")
                .attr("stroke", "#10AED6")
                .on("click", lockOn)
                .on("mouseover", tooltipOver)
                .on("mousemove", tooltipMove)
                .on("mouseout", tooltipOut);
        }
        updateInspector(obj);
    }
}
document.onkeyup = function(e) {
    if ((e.key=='Escape'||e.key=='Esc') && tree.length > 2)
        lockOn(tree[tree.length - 2]);
};
function reset(){
    tree = [atlas];
    if (d3.event.defaultPrevented) d3.event.stopPropagation();
    svg.transition().duration(600).call(
        zoom.transform,
        d3.zoomIdentity,
        d3.zoomTransform(svg.node()).invert([width / 3.5, height / 2])
    );
};
//Style locking
function atlasStyle(obj, prev){
    switch (obj.otype){
        case 0:
            d3.selectAll(".circles")
                .classed("dim", false);
            d3.selectAll(".district")
                .classed("dimd", false)
                .attr("stroke", "#10AED6");
            break;
        case 1:
            let stoplist = [];
            if(prev.otype === 0){
                d3.selectAll(".district")
                    .classed("dimd", true)
                    .attr("stroke", "#222a2e");
            }
            if(prev.otype == 2)
                d3.selectAll(".region")
                    .attr("stroke", "#10AED6")
                    .classed("selected", false);
            else {
                for(region of obj.regions)
                    stoplist = region.stops.last().concat(stoplist);
                d3.selectAll(".circles")
                    .classed("dim", true);
                d3.selectAll(stoplist)
                    .classed("dim", false);
            }
            break;
        case 2:
            d3.selectAll(".region")
                .attr("stroke", "#10AED6")
                .classed("selected", false);
            d3.select(obj.obj)
                .attr("stroke", "#FFFFFF")
                .classed("selected", true)
                .raise();
    }
}

//Zoom handlers
const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .translateExtent([[0, 0], [width, height]])
    .on("zoom", updateZoom);
function updateZoom() {
    const {transform} = d3.event;
    wrapper.attr("transform", transform);
    areas.attr("stroke-width", 0.8 / transform.k * 0.05 + "rem");
}
function areaZoomed(d) {
    let [[x0, y0], [x1, y1]] = path.bounds(d);
    if(d3.event !== null) d3.event.stopPropagation();
    svg.transition().duration(500).call(
        zoom.transform,
        d3.zoomIdentity
            .translate(width/3.5, height/2)
            .scale(Math.min(20, 0.5 / Math.max((x1-x0)/width, (y1-y0)/height)))
            .translate(-(x0+x1)/2,-(y0+y1)/2)
    );
}

