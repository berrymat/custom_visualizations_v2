// Global values provided via the API
declare var looker: Looker;

import * as d3 from "d3";
import { handleErrors } from "../common/utils";

import {
  Row,
  Looker,
  VisualizationDefinition,
  LookerChartUtils,
  Cell,
} from "../types/types";

declare var LookerCharts: LookerChartUtils;

interface HierarchyVisualization extends VisualizationDefinition {
  svg?: d3.Selection<d3.BaseType, {}, null, undefined>;
}

const htmlForCell = (cell: Cell) => {
  return cell.html ? LookerCharts.Utils.htmlForCell(cell) : cell.value;
};

function burrow(table: any, taxonomy: any[]): any {
  // create nested object
  const obj: any = {};

  const flatNodes: any = {};
  table.forEach((row: Row) => {
    const [p, c, n, ...rest] = taxonomy;
    const parentKey = row[p.name].value;
    const childKey = row[c.name].value;

    const child: any = {
      id: childKey,
      name: row[n.name].value,
      html: row[n.name].html, // htmlForCell(row[n.name] as Cell),
      depth: 0,
      count: 0,
      right: true,
      children: [],
      values: rest.map((k) => row[k.name].value),
    };
    flatNodes[childKey] = child;
  });

  table.forEach((row: Row) => {
    const [p, c] = taxonomy;
    const parentKey = row[p.name].value;
    const childKey = row[c.name].value;

    const parent = flatNodes[parentKey];
    const child: any = flatNodes[childKey];
    if (parent) {
      child.depth = parent.depth + 1;
      parent.count++;
      parent.children.push(child);
    }
  });

  const roots = Object.values(flatNodes).filter((n: any) => n.depth === 0);
  if (roots.length > 1) {
    const incrDepth = (n: any) => {
      return {
        ...n,
        depth: n.depth + 1,
        children: n.children.map((c: any) => incrDepth(c)),
      };
    };

    return {
      name: "root",
      count: roots.length,
      children: roots.map((n) => incrDepth(n)),
      depth: 0,
    };
  } else {
    return roots[0];
  }
}

const vis: HierarchyVisualization = {
  id: "hierarchy", // id/label not required, but nice for testing and keeping manifests in sync
  label: "Hierarchy",
  options: {
    color_with_children: {
      label: "Node Color With Children",
      default: "#36c1b3",
      type: "string",
      display: "color",
    },
    color_empty: {
      label: "Empty Node Color",
      default: "#fff",
      type: "string",
      display: "color",
    },
  },

  // Set up the initial state of the visualization
  create(element, config) {
    this.svg = d3.select(element).append("svg");
  },

  // Render in response to the data or settings changing
  update(data, element, config, queryResponse) {
    if (
      !handleErrors(this, queryResponse, {
        min_pivots: 0,
        max_pivots: 0,
        min_dimensions: 2,
        max_dimensions: undefined,
        min_measures: 0,
        max_measures: undefined,
      })
    )
      return;

    let i = 0;
    const nodeColors = {
      children:
        (config && config.color_with_children) ||
        this.options.color_with_children.default,
      empty: (config && config.color_empty) || this.options.color_empty.default,
    };
    const textSize = 13;
    const nodeRadius = 4;
    const duration = 750;
    const leading = 4;
    const nodeWidth = 200;
    const spacingX = 50;
    const spacingY = 8;
    const radius = 19;

    const nested = burrow(data, queryResponse.fields.dimension_like);
    console.log("nested", nested);
    const lines = queryResponse.fields.dimension_like.length - 2; // Subtract for parent/child ids
    const nodeHeight = textSize * lines + leading * (lines + 1);
    const svgScale = 1.0;

    const margin = {
      top: spacingY + nodeHeight / 2,
      right: spacingX + nodeWidth / 2,
      bottom: spacingY + nodeHeight / 2,
      left: spacingX + nodeWidth / 2,
    };
    // const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const width = element.clientWidth - margin.left - margin.right;
    const height = element.clientHeight - margin.top - margin.bottom;

    const nodey = nodeWidth + spacingX;
    const nodex = nodeHeight + spacingY;

    const wrapperWidth = width;
    const wrapperHeight = height;

    const countBorder = 8;
    const countLeft = -nodeWidth / 2 + countBorder;
    const countRight = nodeWidth / 2 - countBorder;
    const countWidth = radius * 2 - countBorder * 2;
    const countTop = -radius + countBorder;
    const countHeight = radius * 2 - countBorder * 2;

    const svg = this.svg!.html("")
      .attr("viewBox", `${-margin.left}, ${-margin.top}, ${width}, ${nodex}`)
      .attr("font-size", "13px");
    // .attr("width", width + margin.right + margin.left)
    // .attr("height", height + margin.top + margin.bottom)
    // .append("g")
    // .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const cssText = `
      .container {
        font-family: "Google Sans", "Noto Sans", "Noto Sans JP", "Noto Sans CJK KR", "Noto Sans Arabic UI", "Noto Sans Devanagari UI", "Noto Sans Hebrew", "Noto Sans Thai UI", Helvetica, Arial, sans-serif;
      }

			.node-selection,
			.node-selection_selected.color {
				fill: rgba(0, 0, 0, 0);
				stroke: rgba(0, 0, 0, 0);
			}

			.node-link_cascade {
				fill: none;
				color : #008000;
				stroke: #008000;
				stroke-opacity: 0.8;
				stroke-width: 1.5;
			}
			
			.node-link {
				fill: none;
				stroke: #595959;
				stroke-opacity: 0.4;
				stroke-width: 1.5;
			}
			
			.node-link_clear {
				fill: none;
				stroke: none;
			}
			
			.node-link_weak {
				fill: none;
				stroke: #595959;
				stroke-opacity: 0.25;
				stroke-width: 1;
				stroke-dasharray: 2 1;
			}
			
			.node-link_strong {
				fill: none;
				stroke: #595959;
				stroke-opacity: 0.8;
				stroke-width: 1.5;
			}
			
			.node-background_loadmore {
				fill: #e9e9e9;
				stroke: #d9d9d9;
				stroke-width: 0.5;
				stroke-dasharray: 4 1;
			}
			
			.node-background_count {
				fill: rgba(255, 255, 255, 0.75);
				font-weight: 600;
			}
			
			.node-background_default {
				fill: rgba(0, 112, 210, 0.24);
			}
			
			.node-selection_selected {
				fill: #1b5397;
				stroke: #1b5397;
			}
			
			.node-text {
				fill: #1b5397;
			}
			
			.node-text_count {
				fill: #0061c2;
				font-size: 11px;
				font-weight: 600;
			}
			
			.node-text_selected {
				fill: #fff;
			}
			
			.node-text-nolink {
				cursor: default;
				fill: #999999;
			}
			
			.node-text:hover > .node-text-link {
				text-decoration: underline;
			}
			
			.node-value {
				font-size: 11px;
			}
			
			.highlighted > rect.node-background {
				filter: none;
			}
			
			.highlighted > rect.node-selection {
				stroke: #ff9300;
				stroke-width: 4px;
				stroke-opacity: 0.6;
			}
		`;
    svg.append("style").text(cssText);

    // filters go in defs element
    const defs = svg.append("defs");

    // create filter with id #drop-shadow
    // height=130% so that the shadow is not clipped
    const filter = defs
      .append("filter")
      .attr("id", "drop-shadow")
      .attr("x", "-20%")
      .attr("y", "-0%")
      .attr("width", "200%")
      .attr("height", "200%");

    filter
      .append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", "2.5");

    filter
      .append("feOffset")
      .attr("dx", "1")
      .attr("dy", "3")
      .attr("result", "offsetblur");

    filter
      .append("feComponentTransfer")
      .append("feFuncA")
      .attr("type", "linear")
      .attr("slope", "2");

    filter
      .append("feColorMatrix")
      .attr("in", "blur")
      .attr("mode", "matrix")
      .attr("color-interpolation-filters", "sRGB")
      .attr(
        "values",
        "0 0 0 0 0.243  0 0 0 0 0.402  0 0 0 0 0.7215  0 0 0 1.5 0"
      )
      .attr("result", "offsetblur");

    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const gLink = svg.append("g");

    const gNode = svg
      .append("g")
      .attr("class", "container")
      .attr("cursor", "pointer")
      .attr("pointer-events", "all");

    // TODO ?
    // this.left.tree(this.left.root);
    // this.right.tree(this.right.root);

    // this.update(this.left, this.left.root);
    // this.update(this.right, this.right.root);

    // declares a tree layout and assigns the size
    const treemap = d3.tree().nodeSize([nodex, nodey]);

    // Assigns parent, children, height, depth
    const rootNode: any = d3.hierarchy(nested, (d) => d.children);
    rootNode.x0 = nodey / 2;
    rootNode.y0 = 0;
    let nodeId = 0;
    rootNode.descendants().forEach((d: any) => {
      d.id = nodeId++;
    });

    // define some helper functions that close over our local variables

    // Collapse the node and all it's children
    function collapse(d: any) {
      if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
      }
    }

    const centerRect = (w: number, h: number, rx: number, x = 0, y = 0) => {
      return {
        x: x - w / 2,
        y: y - h / 2,
        width: w,
        height: h,
        rx,
      };
    };

    const shrinkRect = (
      {
        x,
        y,
        width: w,
        height: h,
        rx,
      }: { x: number; y: number; width: number; height: number; rx: number },
      shrink: number
    ) => {
      return {
        x: x + shrink / 2,
        y: y + shrink / 2,
        width: w - shrink,
        height: h - shrink,
        rx: Math.max(0, rx - shrink / 2),
      };
    };

    const setAttrs = (node: any, values: any) => {
      return Object.keys(values).reduce((selection, k) => {
        return selection.attr(k, values[k]);
      }, d3.select(node));
    };

    const diagonal = (args: any) => {
      const down = "down";
      const { source, target, doubleArrow } = args;
      const { direction } = target.data || { direction: down };
      const { right } = target.data || { right: true };
      const arrowRight = right ? direction === down : direction !== down;

      const dy = target.y - source.y;
      const triangleX = dy / 8;
      const triangleY = (triangleX * 2) / 3;

      const newTarget = {
        ...target,
        y: target.y - triangleX * 2,
      };

      const diag = d3
        .linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x);
      const curve = diag({ source, target: newTarget });

      const triangle = arrowRight
        ? `l${triangleX},${-triangleY}l0,${
            triangleY * 2
          }l${-triangleX},${-triangleY}m${triangleX},0`
        : `m${triangleX},0l${-triangleX},${-triangleY}l0,${
            triangleY * 2
          }l${triangleX},${-triangleY}`;

      const pathCascade = `${curve}${triangle}${triangle}L${target.y},${target.x}`;
      const path = `${curve}${triangle}L${target.y},${target.x}`;
      return doubleArrow ? pathCascade : path;
    };

    const wrap = (node: any) => {
      const self = d3.select(node);
      const d: any = self.datum ? self.datum() : node;
      const textLeft =
        -nodeWidth / 2 +
        (d.countLeftLength ? d.countLeftLength + countBorder * 4 : radius);
      const textRight = d.countRightLength
        ? countRight - (d.countRightLength + countBorder * 2) - countBorder
        : nodeWidth / 2 - radius;
      const textWidth = textRight - textLeft;

      let dy = -leading - 9 * (lines - 2) + 1,
        lineHeight = textSize + leading,
        tspan = self
          .append("tspan")
          .attr("x", textLeft)
          // .attr("class", (d: any) =>
          //   d.data.nolink ? "node-text-nolink" : "node-text-link"
          // )
          // .on("click", nodeLinkClick)
          .attr("dy", dy + "px");
      tspan.text(d.data.name);

      const truncate = (tspan: any, value: any) => {
        const computedWidth = tspan.node().getComputedTextLength();
        if (computedWidth > textWidth) {
          // Text won't fit
          let i = value.length;
          do {
            i--;
            const text = value.slice(0, i) + "...";
            tspan.text(text);
          } while (tspan.node().getComputedTextLength() > textWidth);
        }
      };

      if (d.data.values) {
        // Name takes single line at top and value is second line
        truncate(tspan, d.data.name);

        let valuey =
          d.data.name && d.data.name.length > 0
            ? lineHeight
            : lineHeight - leading;

        const { values } = d.data;
        console.log("d", d);
        console.log("values", values);
        for (let i = 0; i < values.length; i++) {
          let value = values[i];
          if (value) {
            const valueTspan = self
              .append("tspan")
              .attr("x", textLeft)
              .attr("style", "font-size: 11px;")
              .attr("dy", valuey + "px");

            valueTspan.text(value);
            truncate(valueTspan, value);
          }
        }
      } else {
        const textNode: SVGTextElement = tspan.node() as SVGTextElement;
        if (textNode.getComputedTextLength() > textWidth) {
          const words = d.data.name.split(/\s+/).reverse();
          let word,
            line = [],
            lineNumber = 0;

          while ((word = words.pop())) {
            line.push(word);
            const lineText = line.join(" ");
            tspan.text(lineText);
            if (textNode.getComputedTextLength() > textWidth) {
              if (line.length === 1 || lineNumber === 1) {
                // Single word is too long - need to hyphenate or we're on the second row so ellipsize
                let i = lineText.length;
                do {
                  i--;
                  const text =
                    lineText.slice(0, i) + (lineNumber === 1 ? "..." : "-");
                  tspan.text(text);
                } while (textNode.getComputedTextLength() > textWidth);
                line = [lineText.slice(i)];
              } else {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
              }
              if (lineNumber === 1) {
                break;
              }
              tspan = self
                .append("tspan")
                .attr("x", textLeft)
                .attr("class", "node-text-link")
                .on("click", nodeLinkClick)
                .attr("dy", ++lineNumber * lineHeight + "px")
                .text(line[0]);
            }
          }
        } else {
          tspan.attr("dy", "3px");
        }
      }
    };

    // Creates a curved (diagonal) path from parent to the child nodes
    // function diagonal(s: any, d: any) {
    //   const path = `
    //     M ${s.y} ${s.x}
    //     C ${(s.y + d.y) / 2} ${s.x},
    //       ${(s.y + d.y) / 2} ${d.x},
    //       ${d.y} ${d.x}
    //   `.trim();

    //   return path;
    // }

    // Toggle children on click.
    function click(d: any) {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
      update(d);
    }

    const getX = (node: any, x: number) => x;
    const getY = (node: any, y: number) => y;
    const nodeClick = (root: any) => (node: any) => {
      click(node);
    };

    const htmlToElement = (html: any) => {
      var template = document.createElement("template");
      html = html.trim(); // Never return a text node of whitespace as the result
      template.innerHTML = html;
      return template.content.firstChild;
    };

    const nodeLinkClick = (d: any) => {
      if (d.data && d.data.rowOffset) {
        return nodeClick(d);
      }
      d3.event.stopPropagation();
      console.log("nodeLinkClick", d.data.html);
      const anchor = htmlToElement(d.data.html) as HTMLAnchorElement;

      document.location.href = anchor.href;

      // document.body.appendChild(anchor);
      // if (anchor && anchor.click) {
      //   anchor.click();
      // }
      // if (anchor && anchor.href) {
      //   window.open(anchor.href, "_self");
      // }
      // this.dispatchEvent(new CustomEvent("navigate", { detail: d.data }));
      // window.location = anchor.href as Location;
      return null;
    };

    // Update the display for a given node
    function update(source: any) {
      const createNodeEnter = (node: any) => {
        // Enter any new nodes at the parent's previous position.
        const nodeEnter = node
          .enter()
          .append("g")
          .attr(
            "transform",
            () =>
              `translate(${getY(source, source.y0 + nodeWidth)},${getX(
                source,
                source.x0
              )})`
          )
          .attr("fill-opacity", 0)
          .attr("stroke-opacity", 0)
          .on("click", nodeClick(rootNode));
        return nodeEnter;
      };

      // Assigns the x and y position for the nodes
      const treeData = treemap(rootNode);

      // Compute the new tree layout.
      const nodes = treeData.descendants().reverse();
      const links = treeData.links();

      // // Normalize for fixed-depth.
      // nodes.forEach((d) => {
      //   d.y = d.depth * 180;
      // });

      let left = rootNode;
      let right = rootNode;
      let top = rootNode;
      let bottom = rootNode;
      rootNode.eachBefore((node: any) => {
        if (getX(node, node.x) < getX(left, left.x)) left = node;
        if (getX(node, node.x) > getX(right, right.x)) right = node;
        if (getY(node, node.y) < getY(top, top.y)) top = node;
        if (getY(node, node.y) > getY(bottom, bottom.y)) bottom = node;
      });

      const viewWidth =
        getY(bottom, bottom.y) - getY(top, top.y) + margin.left + margin.right;
      const viewHeight =
        getX(right, right.x) - getX(left, left.x) + margin.top + margin.bottom;
      const svgWidth = Math.max(viewWidth / svgScale, wrapperWidth);
      const svgHeight = Math.max(viewHeight / svgScale, wrapperHeight);

      const widthDiff = Math.max(0, svgWidth - viewWidth);
      const transition = svg
        .transition()
        .duration(duration)
        .attr(
          "viewBox",
          `${getY(top, top.y) - margin.left - widthDiff / 2},${
            getX(left, left.x) - margin.top
          },${viewWidth + widthDiff},${viewHeight}`
        );
      // .tween(
      //   "resize",
      //   window.ResizeObserver ? null : () => () => svg.dispatch("toggle")
      // );

      // Update the nodes…
      const node = gNode.selectAll("g").data(nodes, (d: any) => d.id);

      const nodeEnter = createNodeEnter(node);

      const nodeRect = centerRect(nodeWidth, nodeHeight, radius);

      // const setAttrs = (rect: any) => {
      //   return function () {
      //     return self.setAttrs(this, rect);
      //   };
      // };
      // const wrap = function () {
      //   return self.wrap(this);
      // };

      const setAttrsFn = (rect: any) => {
        return function (this: any) {
          return setAttrs(this, rect);
        };
      };
      const wrapFn = function (this: any) {
        return wrap(this);
      };

      nodeEnter
        .append("rect")
        .attr("class", (d: any) => {
          return d.data.rowOffset
            ? "node-background_loadmore"
            : d.data.color
            ? "node-background"
            : "node-background node-background_default";
        })
        .each(setAttrsFn(nodeRect))
        .attr("rx", radius)
        .attr("fill", (d: any) => d.data.color);

      const selectionStrokeWidth = 1.5;
      const selectionRect = shrinkRect(nodeRect, selectionStrokeWidth * 0.8);

      // Selection layer
      nodeEnter
        .append("rect")
        .attr("class", "node-selection")
        .each(setAttrsFn(selectionRect))
        .attr("stroke-width", selectionStrokeWidth);

      // Calculate left count text width
      nodeEnter
        .filter(
          (d: any) =>
            (!d.data.right && d.data.count) ||
            (d.data.right && d.data.parentCount)
        )
        .append("text")
        .attr("x", countLeft + countBorder)
        .attr("dy", "2px")
        .attr("fill", "rgba(0, 0, 0, 0)")
        .attr("text-anchor", "end")
        .text((d: any) => (!d.data.right ? d.data.count : d.data.parentCount))
        .attr("data-textleftlength", function (this: any, d: any) {
          const countLeftLength = Math.max(
            this.getComputedTextLength(),
            countWidth - countBorder * 2
          );
          d.countLeftLength = countLeftLength;
          return countLeftLength;
        });

      nodeEnter
        .filter(
          (d: any) =>
            (!d.data.right && d.data.count) ||
            (d.data.right && d.data.parentCount)
        )
        .append("rect")
        .attr("class", "node-background_count")
        .attr("x", (d: any) => countLeft)
        .attr("y", countTop)
        .attr("width", (d: any) => d.countLeftLength + countBorder * 2)
        .attr("height", countHeight)
        .attr("rx", countHeight / 2);

      // Display count text
      nodeEnter
        .filter(
          (d: any) =>
            (!d.data.right && d.data.count) ||
            (d.data.right && d.data.parentCount)
        )
        .append("text")
        .attr("class", "node-text_count")
        .attr(
          "x",
          (d: any) => countLeft + (d.countLeftLength + countBorder * 2) / 2
        )
        .attr("dy", "3px")
        .attr("text-anchor", "middle")

        .text((d: any) => (!d.data.right ? d.data.count : d.data.parentCount));

      // Calculate right count text width
      nodeEnter
        .filter((d: any) => d.data.right && d.data.count)
        .append("text")
        .attr("x", countRight - countBorder)
        .attr("dy", "3px")
        .attr("fill", "rgba(0, 0, 0, 0)")
        .attr("text-anchor", "end")
        .text((d: any) => d.data.count)
        .attr("data-textrightlength", function (this: any, d: any) {
          const countRightLength = Math.max(
            this.getComputedTextLength(),
            countWidth - countBorder * 2
          );
          d.countRightLength = countRightLength;
          return countRightLength;
        });

      nodeEnter
        .filter((d: any) => d.data.right && d.data.count)
        .append("rect")
        .attr("class", "node-background_count")
        .attr(
          "x",
          (d: any) => countRight - (d.countRightLength + countBorder * 2)
        )
        .attr("y", countTop)
        .attr("width", (d: any) => d.countRightLength + countBorder * 2)
        .attr("height", countHeight)
        .attr("rx", countHeight / 2);

      // Display count text
      nodeEnter
        .filter((d: any) => d.data.right && d.data.count)
        .append("text")
        .attr("class", "node-text_count")
        .attr(
          "x",
          (d: any) => countRight - (d.countRightLength + countBorder * 2) / 2
        )
        .attr("dy", "3px")
        .attr("text-anchor", "middle")

        .text((d: any) => d.data.count);

      // Selected #0e5588
      // Node #CBE7FE
      // Text #165A8D
      nodeEnter
        .append("text")
        .attr("class", (d: any) => `node-text${d.data.color ? ` color` : ``}`)
        .attr(
          "x",
          (d: any) =>
            -nodeWidth / 2 +
            (d.countLeftLength ? countBorder * 4 + d.countLeftLength : radius)
        )
        .attr("dy", "3px")
        .each(wrapFn);

      // Transition nodes to their new position.
      const nodeUpdate = node
        .merge(nodeEnter)
        .transition(transition)
        .attr("transform", (d) => `translate(${getY(d, d.y)},${getX(d, d.x)})`)
        .attr("fill-opacity", (d: any) =>
          d.depth === 0 && !d.data.right ? 0 : 1
        )
        .attr("stroke-opacity", (d: any) =>
          d.depth === 0 && !d.data.right ? 0 : 1
        )
        .attr("record-id", (d: any) => d.data.id);
      nodeUpdate.select("rect.node-background").attr("filter", (d) => {
        return d.children ? `url(#drop-shadow)` : ``;
      });
      nodeUpdate
        .select("rect.node-selection")
        .attr(
          "class",
          (d: any) =>
            `node-selection${d.data.color ? " color" : ""}${
              d.children ? " node-selection_selected" : ""
            }`
        );
      nodeUpdate
        .select("text.node-text")
        .attr(
          "class",
          (d: any) =>
            `node-text${d.data.color ? ` color` : ``}${
              d.children ? " node-text_selected" : ""
            }`
        );

      // Transition exiting nodes to the parent's new position.
      node
        .exit()
        .transition(transition)
        .remove()
        .attr(
          "transform",
          () =>
            `translate(${getY(source, source.y + nodeWidth)},${getX(
              source,
              source.x
            )})`
        )
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0);

      // Update the links…
      const link = gLink.selectAll("path").data(links, (d: any) => d.target.id);
      // Enter any new links at the parent's previous position.

      let xx = 0;
      const getCascadeFlag = (d: any) => {
        let cascadeFlag = undefined;

        cascadeFlag = d.target.data.Cascade > -1;

        if (d.source.countRightLength === undefined)
          cascadeFlag = d.source.data.Cascade > -1;

        return cascadeFlag;
      };
      const linkEnter = link
        .enter()
        .append("path")
        .attr("d", (d) => {
          const o = {
            x: getX(source, source.x0),
            y: getY(source, source.y0 + nodeWidth / 2),
          };
          const cascadeFlag = getCascadeFlag(d);

          return diagonal({
            source: o,
            target: o,
            doubleArrow: cascadeFlag,
          });
        })
        .attr("class", (d: any) => {
          const cascadeFlag = getCascadeFlag(d);

          const nd = `node-link${
            d.target.data.link ? `_${d.target.data.link}` : ``
          }${d.target.data.rowOffset ? ` node-link_clear` : ``}`;
          return `${cascadeFlag ? ` node-link_cascade ` : `  ${nd} `}`;
        });
      // Transition links to their new position.
      let yy = 0;
      link
        .merge(linkEnter)
        .transition(transition)
        .attr("d", (d) => {
          const cascadeFlag = getCascadeFlag(d);

          const { source: dsource, target: dtarget } = d;
          const nd = {
            source: {
              ...dsource,
              y: getY(dsource, dsource.y + nodeWidth / 2),
            },
            target: {
              ...dtarget,
              y: getY(dtarget, dtarget.y - nodeWidth / 2),
            },
            doubleArrow: cascadeFlag,
          };
          return diagonal(nd);
        });

      // Transition exiting nodes to the parent's new position.
      link
        .exit()
        .transition(transition)
        .remove()
        .attr("d", (d) => {
          const o = {
            x: getX(source, source.x),
            y: getY(source, source.y + nodeWidth / 2),
          };
          const cascadeFlag = getCascadeFlag(d);

          return diagonal({
            source: o,
            target: o,
            doubleArrow: cascadeFlag,
          });
        });

      // Stash the old positions for transition.
      rootNode.eachBefore((d: any) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    // Collapse after the second level
    rootNode.children.forEach(collapse);

    // Update the root node
    update(rootNode);
  },
};

looker.plugins.visualizations.add(vis);
