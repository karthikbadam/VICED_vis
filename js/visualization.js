var files;
function handleFileSelect(evt) {
	files = evt.target.files;
	// FileList object

	// files is a FileList of File objects. List some properties.
	var output = [];
	for (var i = 0, f; f = files[i]; i++) {
		output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ', f.size, ' bytes, last modified: ', f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a', '</li>');
	}
	document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
	readData(0);
}

function readData(fileindex) {
	var reader = new FileReader();
	// Closure to capture the file information.
	f = files[fileindex];
	reader.onload = (function(theFile) {
		return function(e) {
			// Render thumbnail.
			var span = document.createElement('span');
			//span.innerHTML = '<ul>'+ [e.target.result].join('')+'</ul>';
			document.getElementById('list').insertBefore(span, null);

		};
	})(f);

	// Read in the image file as a data URL.
	//reader.readAsDataURL(f);
	reader.readAsText(f);
	visualize(f);
}

//global

var maxDataPoint = 1;
var margin = {
	top : 10,
	right : 40,
	bottom : 150,
	left : 150
}, width = 940 - margin.left - margin.right, height = 1000 - margin.top - margin.bottom, contextHeight = 50;
contextWidth = width * .75;
this.display = d3.select("#chart-container");

function visualize(file) {
	//var svg = display.append("svg").attr("width", width + margin.left + margin.right).attr("height", (height + margin.top + margin.bottom));

	var reader = new FileReader();
	reader.readAsText(file);
	reader.onload = function(event) {
		var csvdata = $.csv.toArrays(event.target.result);
		var propertiesCount = 0;
		var data = d3.csv.parse(event.target.result);
		var html = '';
		//var maxDataPoint = -500;
		//var minDataPoint = 500;
		var variables = [];

		var maxDataPoint = new Array();
		var minDataPoint = new Array();
		for (var prop in data[0]) {
			if (data[0].hasOwnProperty(prop)) {
				//make note of the properties to be visualized
				if (prop == 'p1' || prop == 'p2' || prop == 'p3' || prop == 'p4' || prop == 'upload') {
					variables.push(prop);
					maxDataPoint[propertiesCount] = -500;
					minDataPoint[propertiesCount] = 500;
					propertiesCount++;

				}
			}
		};

		//time format
		var format = d3.time.format("%H:%M:%S");
		data.forEach(function(d) {
			var i = 0;
			for (var prop in d) {
				if (d.hasOwnProperty(prop)) {
					//convert the values of the properties to numbers!
					if (prop == 'p1' || prop == 'p2' || prop == 'p3' || prop == 'p4' || prop == 'upload') {
						d[prop] = parseFloat(d[prop]);
						if (d[prop] > maxDataPoint[i]) {
							maxDataPoint[i] = d[prop];
						}
						if (d[prop] < minDataPoint[i]) {
							minDataPoint[i] = d[prop];
						}
						i++;
					}
					if (prop == 'Time') {
						d[prop] = format.parse(d[prop]);
					}

				}

			}
		});
		var charts = [];

		//visualize as a chart
		var startTime = data[0].Time;
		var endTime = data[data.length - 1].Time;
		var chartHeight = height * (1 / propertiesCount);

		for (var i = 0; i < propertiesCount; i++) {
			charts.push(new Chart({
				data : data.slice(),
				id : i,
				name : variables[i],
				width : width,
				height : height * (1 / (propertiesCount + 1)),
				maxDataPoint : maxDataPoint[i],
				minDataPoint : minDataPoint[i],
				//svg : svg,
				margin : margin,
				showBottomAxis : (i == propertiesCount - 1)
			}));
		}
		/* Let's create the context brush that will
		 let us zoom and pan the chart */
		var svg = display.append("div").attr("id", "context").append("svg").attr("width", width + margin.left + margin.right).attr("height", (height / (propertiesCount + 1)) + 20);

		var contextXScale = d3.time.scale().range([0, contextWidth]).domain(charts[0].xScale.domain());

		var contextAxis = d3.svg.axis().scale(contextXScale).tickSize(contextHeight).tickPadding(-10).orient("bottom");

		var contextArea = d3.svg.area().interpolate("monotone").x(function(d) {
			return contextXScale(d.Time);
		}).y0(contextHeight).y1(0);

		var brush = d3.svg.brush().x(contextXScale).on("brush", onBrush);
		var context = svg.append("g").attr("class", "context").attr("transform", "translate(" + (margin.left + width * .1) + "," + (10) + ")");
		context.append("g").attr("class", "x axis top").attr("transform", "translate(0,0)").call(contextAxis)
		context.append("g").attr("class", "x brush").call(brush).selectAll("rect").attr("y", 0).attr("height", contextHeight);
		context.append("text").attr("class", "instructions").attr("transform", "translate(0," + (contextHeight + 20) + ")").text('Click and drag above to zoom / pan the data');
		function onBrush() {
			/* this will return a date range to pass into the chart object */
			var b = brush.empty() ? contextXScale.domain() : brush.extent();
			for (var i = 0; i < propertiesCount; i++) {
				charts[i].showOnly(b);
			}
		}

	};
	reader.onerror = function() {
		alert('Unable to read ' + file.fileName);
	};
}

//Chart class
function Chart(options) {
	this.svg = display.append("svg").attr("width", width + margin.left + margin.right).attr("height", (options.height + 20));
	this.chartData = options.data;
	this.width = options.width;
	this.height = options.height;
	this.maxDataPoint = options.maxDataPoint;
	this.minDataPoint = options.minDataPoint;
	//	this.svg = options.svg;
	this.id = options.id;
	this.name = options.name;
	this.margin = options.margin;
	this.showBottomAxis = options.showBottomAxis;
	
	var localName = this.name;
	var svg = this.svg;
	var data = this.chartData;
	/* XScale is time based */
	this.xScale = d3.time.scale().range([0, this.width]).domain(d3.extent(this.chartData.map(function(d) {
		return d.Time;
	})));

	/* YScale is linear based on the maxData Point we found earlier */
	this.yScale = d3.scale.linear().range([this.height, 0]).domain([this.minDataPoint, this.maxDataPoint]);
	var xS = this.xScale;
	var yS = this.yScale;
	/*Zoom YAxis when needed*/
	var zoom = d3.behavior.zoom().on("zoom", zoomY);
	zoom.y(yS);

	function zoomY() {
		var yExtent = d3.extent(data.filter(function(d) {
			var dt = yS(d[localName]);
			return dt > 0 && dt < height;
		}), function(d) {
			return d[localName];
		});
		yS.domain(yExtent).nice();
		svg.select("g.y.axis").call(yAXIS);
		svg.select("path.chart").attr("d", area);
	}

	/*
	 This is what creates the chart.
	 There are a number of interpolation options.
	 'basis' smooths it the most, however, when working with a lot of data, this will slow it down
	 */
	this.area = d3.svg.area().interpolate("linear").x(function(d) {
		return xS(d.Time);
	}).y0(this.height).y1(function(d) {
		return yS(d[localName]);
	});
	var area = this.area;

	/*
	 This isn't required - it simply creates a mask. If this wasn't here,
	 when we zoom/panned, we'd see the chart go off to the left under the y-axis
	 */

	this.svg.append("defs").append("clipPath").attr("id", "clip-" + this.id).append("rect").attr("width", this.width).attr("height", this.height);
	/*
	 Assign it a class so we can assign a fill color
	 And position it on the page
	 */

	this.chartContainer = this.svg.append("g").attr('class', this.name.toLowerCase()).attr("transform", "translate(" + this.margin.left + "," + 10 + ")");
	/* We've created everything, let's actually add it to the page */
	this.path = this.chartContainer.append("path").data([this.chartData]).attr("class", "chart").attr("clip-path", "url(#clip-" + this.id + ")").attr("d", this.area);

	this.xAxisTop = d3.svg.axis().scale(this.xScale).orient("bottom");
	this.xAxisBottom = d3.svg.axis().scale(this.xScale).orient("top");
	/* We only want a top axis if it's the first country */
	if (this.id == 0) {
		this.chartContainer.append("g").attr("class", "x axis top").attr("transform", "translate(0,0)").call(this.xAxisTop);
	}
	/* Only want a bottom axis on the last country */
	if (this.showBottomAxis) {
		this.chartContainer.append("g").attr("class", "x axis bottom").attr("transform", "translate(0," + this.height + ")").call(this.xAxisBottom);
	}

	this.yAxis = d3.svg.axis().scale(this.yScale).orient("left").ticks(5);
	var yAXIS = this.yAxis;

	this.chartContainer.append("g").attr("class", "y axis").attr("transform", "translate(-15,0)").call(this.yAxis);
	this.chartContainer.append("text").attr("class", "Person-title").attr("transform", "translate(15,40)").text(this.name).call(zoom);
	;
	this.chartContainer.append("rect").attr("class", "pane").attr("width", this.width).attr("height", this.height).call(zoom);
}

Chart.prototype.showOnly = function(b) {
	this.xScale.domain(b);
	this.chartContainer.select("path").data([this.chartData]).attr("d", this.area);
	this.chartContainer.select(".x.axis.top").call(this.xAxisTop);
	this.chartContainer.select(".x.axis.bottom").call(this.xAxisBottom);
}

document.getElementById('files').addEventListener('change', handleFileSelect, false);

