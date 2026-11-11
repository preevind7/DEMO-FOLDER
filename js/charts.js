(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  const NS = "http://www.w3.org/2000/svg";

  function node(name, attributes, text) {
    const element = document.createElementNS(NS, name);
    Object.entries(attributes || {}).forEach(function (entry) { element.setAttribute(entry[0], entry[1]); });
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function svgRoot(label, width, height) {
    const svg = node("svg", { viewBox: "0 0 " + width + " " + height, role: "img", "aria-label": label, preserveAspectRatio: "xMidYMid meet" });
    return svg;
  }
  function linePath(values, x, y, width, height, min, max) {
    return values.map(function (value, index) {
      const px = x + index * width / Math.max(1, values.length - 1);
      const py = y + height - (value - min) / (max - min || 1) * height;
      return (index ? "L" : "M") + px.toFixed(1) + " " + py.toFixed(1);
    }).join(" ");
  }
  function axisText(svg, x, y, value, anchor) {
    svg.append(node("text", { x: x, y: y, fill: "currentColor", "font-size": 10, "text-anchor": anchor || "middle" }, value));
  }

  FDT.charts = {
    line: function (options) {
      const values = options.values || [];
      const width = 620;
      const height = 220;
      const pad = { left: 42, right: 12, top: 16, bottom: 30 };
      const plotWidth = width - pad.left - pad.right;
      const plotHeight = height - pad.top - pad.bottom;
      const min = options.min === undefined ? 0 : options.min;
      const max = options.max === undefined ? 1 : options.max;
      const svg = svgRoot(options.label || "Line chart", width, height);
      [0, 0.5, 1].forEach(function (fraction) {
        const y = pad.top + fraction * plotHeight;
        svg.append(node("line", { x1: pad.left, y1: y, x2: width - pad.right, y2: y, stroke: "var(--border)", "stroke-width": 1 }));
        axisText(svg, pad.left - 7, y + 3, (max - fraction * (max - min)).toFixed(2), "end");
      });
      if (options.threshold !== undefined) {
        const thresholdY = pad.top + plotHeight - (options.threshold - min) / (max - min || 1) * plotHeight;
        svg.append(node("line", { x1: pad.left, y1: thresholdY, x2: width - pad.right, y2: thresholdY, stroke: "var(--red)", "stroke-width": 1.5, "stroke-dasharray": "6 5" }));
        axisText(svg, width - pad.right - 2, thresholdY - 5, "Threshold " + options.threshold, "end");
      }
      svg.append(node("path", { d: linePath(values, pad.left, pad.top, plotWidth, plotHeight, min, max), fill: "none", stroke: options.color || "var(--blue)", "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }));
      values.forEach(function (value, index) {
        const x = pad.left + index * plotWidth / Math.max(1, values.length - 1);
        const y = pad.top + plotHeight - (value - min) / (max - min || 1) * plotHeight;
        const point = node("circle", { cx: x, cy: y, r: 3, fill: options.color || "var(--blue)" });
        point.append(node("title", {}, (index + 1) + ": " + value));
        svg.append(point);
      });
      [0, 6, 12, 18, 23].forEach(function (hour) {
        if (hour < values.length) axisText(svg, pad.left + hour * plotWidth / Math.max(1, values.length - 1), height - 8, String(hour).padStart(2, "0") + ":00");
      });
      return svg;
    },
    bar: function (options) {
      const values = options.values || [];
      const width = 620;
      const height = 220;
      const pad = { left: 42, right: 12, top: 16, bottom: 34 };
      const plotWidth = width - pad.left - pad.right;
      const plotHeight = height - pad.top - pad.bottom;
      const max = options.max || Math.max(1, ...values);
      const slot = plotWidth / Math.max(1, values.length);
      const svg = svgRoot(options.label || "Bar chart", width, height);
      [0, 0.5, 1].forEach(function (fraction) {
        const y = pad.top + fraction * plotHeight;
        svg.append(node("line", { x1: pad.left, y1: y, x2: width - pad.right, y2: y, stroke: "var(--border)" }));
      });
      if (options.threshold !== undefined) {
        const y = pad.top + plotHeight - options.threshold / max * plotHeight;
        svg.append(node("line", { x1: pad.left, y1: y, x2: width - pad.right, y2: y, stroke: "var(--red)", "stroke-dasharray": "6 5", "stroke-width": 1.5 }));
        axisText(svg, width - pad.right, y - 4, "Threshold " + options.threshold, "end");
      }
      values.forEach(function (value, index) {
        const barHeight = Math.max(0, value / max * plotHeight);
        const rect = node("rect", {
          x: pad.left + index * slot + slot * 0.17, y: pad.top + plotHeight - barHeight,
          width: Math.max(1, slot * 0.66), height: barHeight,
          rx: 3, fill: options.threshold !== undefined && value > options.threshold ? "var(--red)" : options.color || "var(--blue)"
        });
        rect.append(node("title", {}, String(index).padStart(2, "0") + ":00 · " + value));
        svg.append(rect);
        if (index % Math.max(1, Math.ceil(values.length / 12)) === 0) axisText(svg, pad.left + index * slot + slot / 2, height - 9, String(index).padStart(2, "0"));
      });
      return svg;
    },
    histogram: function (options) {
      const series = options.series || [];
      const bins = Math.max(1, ...series.map(function (item) { return item.values.length; }));
      const width = 620;
      const height = 220;
      const pad = { left: 38, right: 12, top: 14, bottom: 30 };
      const plotWidth = width - pad.left - pad.right;
      const plotHeight = height - pad.top - pad.bottom;
      const allValues = [];
      series.forEach(function (item) { allValues.push.apply(allValues, item.values); });
      const maximum = Math.max(1, ...allValues);
      const slot = plotWidth / bins;
      const svg = svgRoot(options.label || "Overlaid histogram", width, height);
      series.forEach(function (item, seriesIndex) {
        item.values.forEach(function (value, index) {
          const rect = node("rect", {
            x: pad.left + index * slot + 1, y: pad.top + plotHeight - value / maximum * plotHeight,
            width: Math.max(1, slot - 2), height: value / maximum * plotHeight,
            fill: item.color || (seriesIndex ? "var(--green)" : "var(--red)"), opacity: 0.64,
            tabindex: 0, "aria-label": (item.name || "Series") + ", bin " + index + ", count " + value
          });
          rect.append(node("title", {}, (item.name || "Series") + " · bin " + index + " · " + value + " runs"));
          svg.append(rect);
        });
      });
      axisText(svg, pad.left, height - 8, "0 min", "start");
      axisText(svg, width - pad.right, height - 8, (options.maxMinutes || bins * 10) + " min", "end");
      return svg;
    },
    contributions: function (items) {
      const width = 620;
      const rowHeight = 34;
      const height = Math.max(48, items.length * rowHeight);
      const maximum = Math.max(0.01, ...items.map(function (item) { return Math.abs(item.value); }));
      const svg = svgRoot("Horizontal contribution bars", width, height);
      items.forEach(function (item, index) {
        const y = index * rowHeight + 4;
        svg.append(node("text", { x: 0, y: y + 16, fill: "currentColor", "font-size": 12 }, item.label));
        svg.append(node("rect", { x: 310, y: y + 3, width: 250, height: 14, rx: 7, fill: "var(--canvas)" }));
        svg.append(node("rect", { x: 310, y: y + 3, width: Math.max(3, Math.abs(item.value) / maximum * 250), height: 14, rx: 7, fill: item.value < 0 ? "var(--red)" : "var(--blue)" }));
        svg.append(node("text", { x: 608, y: y + 15, fill: "currentColor", "font-size": 12, "text-anchor": "end" }, (item.value > 0 ? "+" : "") + item.value.toFixed(2)));
      });
      return svg;
    },
    riskStrip: function (segments, hour) {
      const width = 820;
      const height = 78;
      const left = 10;
      const top = 14;
      const cellWidth = (width - 20) / Math.max(1, segments.length);
      const svg = svgRoot("Highway risk strip showing " + segments.length + " segments", width, height);
      segments.forEach(function (segment, index) {
        const risk = segment.risk[hour];
        const color = risk >= 0.6 ? "var(--red)" : risk >= 0.3 ? "var(--amber)" : "var(--green)";
        const rect = node("rect", { x: left + index * cellWidth, y: top, width: Math.max(1, cellWidth - 2), height: 31, rx: 4, fill: color, tabindex: 0, "aria-label": segment.id + " " + segment.name + ", risk " + risk.toFixed(2) });
        rect.append(node("title", {}, segment.id + " · " + segment.name + " · risk " + risk.toFixed(2)));
        svg.append(rect);
        axisText(svg, left + index * cellWidth + cellWidth / 2, 63, segment.id);
      });
      return svg;
    },
    sparkline: function (values, color) {
      const width = 120;
      const height = 34;
      const svg = svgRoot("Trend sparkline", width, height);
      const max = Math.max(1, ...values);
      svg.append(node("path", { d: linePath(values, 2, 3, width - 4, height - 6, 0, max), fill: "none", stroke: color || "var(--blue)", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
      return svg;
    },
    gauge: function (value, label) {
      const safeValue = Math.min(1, Math.max(0, Number(value)));
      const svg = svgRoot(label || "Risk gauge", 120, 84);
      svg.append(node("path", { d: "M20 68 A40 40 0 0 1 100 68", fill: "none", stroke: "var(--border)", "stroke-width": 10, "stroke-linecap": "round" }));
      const endAngle = Math.PI - safeValue * Math.PI;
      const endX = 60 + 40 * Math.cos(endAngle);
      const endY = 68 - 40 * Math.sin(endAngle);
      svg.append(node("path", { d: "M20 68 A40 40 0 0 0 " + endX.toFixed(1) + " " + endY.toFixed(1), fill: "none", stroke: safeValue >= 0.6 ? "var(--red)" : safeValue >= 0.3 ? "var(--amber)" : "var(--green)", "stroke-width": 10, "stroke-linecap": "round" }));
      svg.append(node("text", { x: 60, y: 62, fill: "currentColor", "font-size": 20, "font-weight": 700, "text-anchor": "middle" }, safeValue.toFixed(2)));
      return svg;
    }
  };
}());
