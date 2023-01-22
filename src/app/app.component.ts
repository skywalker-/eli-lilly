import { Component, OnInit } from '@angular/core';
import { csv } from 'd3-fetch';
import * as d3 from 'd3';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Eli-Lilly';
  csvData: any;
  populationYears: number[] = [];
  yearToPopulationMap = new Map<number, any>();
  oldestYear = 0;
  latestYear = 0;
  latestPopulation: any = 0;
  globalGrowthData: any[] = [];
  selectedYear: any;
  constructor() { }

  ngOnInit(): void {
    csv('../assets/population.csv').then((data) => {
      this.csvData = data;
      this.processCsvData();
    });
  }

  processCsvData() {
    this.csvData.forEach((obj: any, i: number) => {
      const year = parseInt(obj.Year);
      if (this.populationYears.indexOf(year) === -1) {
        this.populationYears.push(year);
      }
      if (this.yearToPopulationMap.has(year)) {
        const previousData = this.yearToPopulationMap.get(year);
        previousData.countries.push(obj.Country);
        previousData.population.push(Number(obj.Population.replaceAll(',', '')) * 1000);
        previousData.density.push(Number(obj.Population_Density.replaceAll(',', '')));
        previousData.growth.push(!isNaN(parseFloat(obj.Population_Growth_Rate)) ? parseFloat(obj.Population_Growth_Rate) : 0);
      } else {
        if (i === 136) {
          debugger;
        }
        this.yearToPopulationMap.set(year, {
          countries: [obj.Country],
          population: [Number(obj.Population.replaceAll(',', '')) * 1000],
          density: [Number(obj.Population_Density.replaceAll(',', ''))],
          growth: [!isNaN(parseFloat(obj.Population_Growth_Rate)) ? parseFloat(obj.Population_Growth_Rate) : 0]
        });
      }
    });
    this.selectedYear = this.oldestYear = Math.min(...this.populationYears);
    this.latestYear = Math.max(...this.populationYears);
    this.latestPopulation = this.yearToPopulationMap.get(this.latestYear).population.reduce((accumulator: number, current: number) => { return accumulator + current }, 0);
    this.latestPopulation = parseFloat(`${Math.round((this.latestPopulation + Number.EPSILON)) / 1000000000}`).toFixed(2) + ' Bn';
    this.prepareGlobalGrowthData();
    this.prepareGrowthVsDensityChart(this.selectedYear);
  }

  prepareGlobalGrowthData() {
    this.populationYears.forEach(year => {
      this.globalGrowthData.push({ year, population: this.yearToPopulationMap.get(year).population.reduce((accumulator: number, current: number) => { return accumulator + (current) }, 0) });
    });
    // const growthLineChartBounds: any = document.getElementById('growthLineChart')?.getBoundingClientRect();

    const margin = { top: 10, right: 30, bottom: 30, left: 50 },
      width = 460 - margin.left - margin.right,
      height = 145 - margin.top - margin.bottom;

    const svg = d3.select('#growthLineChart')
      .append('svg')
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

    const xAxis = d3.scaleLinear()
      .domain([this.oldestYear, this.latestYear])
      .range([-30, width]);
    svg.append('g')
      .attr('transform', `translate(0, 120)`)
      .call(d3.axisBottom(xAxis).tickValues([this.oldestYear, this.latestYear]).tickFormat(d3.format('d')).tickSize(0));

    const yAxis = d3.scaleLinear()
      .range([height, 0])
      .domain([1000000000, 10000000000]);

    svg.append('path')
      .datum(this.globalGrowthData)
      .attr('fill', '#eae36d')
      .attr('opacity', '1')
      .attr('stroke', '#000')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.5)
      .attr('stroke-linejoin', 'round')
      .attr('d', d3.area()
      .curve(d3.curveBasisOpen)
        .x((d: any) => {
          return xAxis(d.year);
        })
        .y0(yAxis(0))
        .y1((d: any) => {
          return yAxis(d.population)
        })
      );
  }
  prepareGrowthVsDensityChart(year: any) {
    if (year.type === 'change') {
      year = Number((<HTMLSelectElement>document.getElementById('selectYear')).value);
    }
    const margin = { top: 10, right: 20, bottom: 30, left: 50 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    // To clear the previous plotting
    d3.select('#scatterPlotChart').select('svg').remove();
    // To plot the chart with new data
    const svg: any = d3.select('#scatterPlotChart')
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top * 3 + margin.bottom)
      .call(this.responsivefy)
      .style('transition', 'width 2s linear, height 1s ease-out')
      .append('g')
      .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')')
    const yScale = d3.scaleLinear()
      .domain([Math.min(...this.yearToPopulationMap.get(year).growth), Math.max(...this.yearToPopulationMap.get(year).growth)])
      .range([height, 0])
      .nice();
    svg.append('text')
      .attr('x', -200)
      .attr('y', -30)
      .style('text-anchor', 'middle')
      .style('fill', 'black')
      .style('font-size', '18px')
      .style('transform', 'rotate(-90deg)')
      .text("Population Growth (%)");
    const yAxis = d3.axisLeft(yScale);
    svg.call(yAxis);

    const xScale = d3.scaleLinear()
      .domain([0, Math.max(...this.yearToPopulationMap.get(year).density)])
      .range([0, width])
      .nice();

    const xAxis = d3.axisBottom(xScale).ticks(7);
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height + 40)
      .style('text-anchor', 'middle')
      .style('fill', 'black')
      .style('font-size', '18px')
      .text("Population Density");
    svg.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(xAxis);
    const rScale = d3.scaleSqrt()
      .domain([0, Math.max(...this.yearToPopulationMap.get(year).density)])
      .range([1, 40]);

    const circles = svg
      .selectAll('.ball')
      .data(this.yearToPopulationMap.get(year).density)
      .enter()
      .append('g')
      .attr('class', 'ball')
      .attr('transform', (d: any, i: number) => {
        return `translate(${xScale(this.yearToPopulationMap.get(year).density[i])}, ${yScale(this.yearToPopulationMap.get(year).growth[i])})`;
      })
      .append('circle')
      .attr('id', (d: any, i: number) => {
        return `circle_${i}`;
      })
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', (d: any) => rScale(d))
      .style('fill-opacity', 0.6)
      .style('fill', (d: any) => `#${(0x1000000 + Math.random() * 0xFFFFFF).toString(16).substring(0, 6)}`)
      .on('mouseenter', (eve: any) => this.showTooltip(eve, year, svg))
      .on('mouseleave', (eve: any) => d3.select(`#tooltip_${eve.target.id.split('_')[1]}`).remove());
  }
  showTooltip(targetEle: any, year: number, svg: any) {
    const id = Number(targetEle.target.id.split('_')[1]);
    const yearData = this.yearToPopulationMap.get(year);
    const tooltipDiv = document.createElement('div');
    tooltipDiv.setAttribute('id', `tooltip_${id}`);
    tooltipDiv.style.position = 'absolute';
    tooltipDiv.style.left = targetEle.pageX + 'px';
    tooltipDiv.style.top = targetEle.pageY + 'px';
    tooltipDiv.style.fontSize = '10px';
    tooltipDiv.style.padding = '5px 10px';
    tooltipDiv.style.backgroundColor = 'white';
    tooltipDiv.style.boxShadow = '3px 3px 5px #3c3c3c';
    const countryEle = document.createElement('span');
    countryEle.innerHTML = '<strong>Country:</strong>  ' + yearData.countries[id] + '<br>';
    const populationEle = document.createElement('span');
    populationEle.innerHTML = '<strong>Population:</strong>  ' + yearData.population[id] + '<br>';
    const growthEle = document.createElement('span');
    growthEle.innerHTML = '<strong>Population Growth Rate:</strong>  ' + yearData.growth[id] + '<br>';
    const densityEle = document.createElement('span');
    densityEle.innerHTML = '<strong>Population Density:</strong>  ' + yearData.density[id] + '<br>';
    tooltipDiv.appendChild(countryEle);
    tooltipDiv.appendChild(populationEle);
    tooltipDiv.appendChild(growthEle);
    tooltipDiv.appendChild(densityEle);
    document.body.appendChild(tooltipDiv);
  }

  responsivefy(svg: any) {
    // get container + svg aspect ratio
    const container = d3.select(svg.node().parentNode),
      width = parseInt(svg.style("width")),
      height = parseInt(svg.style("height")),
      aspect = width / height;

    // add viewBox and preserveAspectRatio properties,
    // and call resize so that svg resizes on inital page load
    svg.attr("viewBox", "0 0 " + width + " " + height)
      .attr("preserveAspectRatio", "xMinYMid")
      .call(resize);

    // to register multiple listeners for same event type,
    // you need to add namespace, i.e., 'click.foo'
    // necessary if you call invoke this function for multiple svgs
    // api docs: https://github.com/mbostock/d3/wiki/Selections#on
    d3.select(window).on("resize." + container.attr("id"), resize);

    // get width of container and resize svg to fit it
    function resize() {
      const targetWidth = parseInt(container.style("width"));
      svg.attr("width", targetWidth);
      svg.attr("height", Math.round(targetWidth / aspect));
    }
  }
}
