(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  FDT.pages = FDT.pages || {};

  function riskKind(value) {
    return value >= 0.6 ? "danger" : value >= 0.3 ? "warning" : "success";
  }
  function render(root) {
    const corridor = FDT.data.getCorridor(FDT.state.corridorId);
    const segments = FDT.data.getSegments(corridor.id);
    const history = FDT.data.hotspotHistory.filter(function (item) { return item.corridorId === corridor.id; });
    const byId = history.reduce(function (lookup, item) {
      lookup[item.segmentId] = item;
      return lookup;
    }, {});
    const rows = segments.map(function (segment) {
      const historical = byId[segment.id];
      if (!historical) throw new Error("Missing hotspot history for " + segment.id + ".");
      return {
        id: segment.id,
        name: segment.name,
        disruptions: historical.disruptions90d,
        averageDelay: historical.averageDelayMin,
        cause: historical.mainCause,
        risk: segment.risk[10],
        rain: segment.rainMmHr[10],
        segment: segment
      };
    });
    const top = rows.slice().sort(function (a, b) { return b.disruptions - a.disruptions; }).slice(0, 8);
    const totalDisruptions = rows.reduce(function (sum, item) { return sum + item.disruptions; }, 0);
    const averageDelay = rows.length ? rows.reduce(function (sum, item) { return sum + item.averageDelay; }, 0) / rows.length : 0;
    const highestRisk = rows.slice().sort(function (a, b) { return b.risk - a.risk; })[0];
    let selectedSegmentId = highestRisk ? highestRisk.id : "";

    root.innerHTML =
      '<header class="page-heading"><div><p class="small muted">PREDICT MODULE · <span class="simulated">Synthetic history</span></p><h1>Risk Hotspots</h1><p>Identify segments with recurring disruptions and review their current hourly risk · ' + FDT.escapeHtml(corridor.name) + '</p></div><div class="page-actions"><a class="button" href="#/risk-map">Open risk map</a></div></header>' +
      '<div class="hotspot-disclaimer" role="note"><strong>Historical view is simulated</strong><span>Disruption counts and delay averages are illustrative 90-day prototype data. The live risk curve is a separate synthetic hourly forecast.</span></div>' +
      '<section class="kpi-grid" aria-label="Hotspot summary"><article class="kpi-card"><span class="kpi-card__label">Segments analyzed</span><strong class="kpi-card__value number">' + rows.length + '</strong><span class="kpi-card__note">On this corridor</span></article><article class="kpi-card kpi-card--risk"><span class="kpi-card__label">Highest current risk</span><strong class="kpi-card__value number">' + (highestRisk ? highestRisk.risk.toFixed(2) : "—") + '</strong><span class="kpi-card__note">' + (highestRisk ? FDT.escapeHtml(highestRisk.id + " · " + highestRisk.name) : "No segment data") + '</span></article><article class="kpi-card"><span class="kpi-card__label">Illustrative disruptions</span><strong class="kpi-card__value number">' + totalDisruptions + '</strong><span class="kpi-card__note">Combined across segments · 90 days</span></article><article class="kpi-card"><span class="kpi-card__label">Average delay when disrupted</span><strong class="kpi-card__value number">' + Math.round(averageDelay) + ' min</strong><span class="kpi-card__note">Unweighted mean across segments</span></article></section>' +
      '<div class="hotspot-visual-grid"><section class="card hotspot-history-card"><div class="card__header"><div><h2>Most frequent disruption locations</h2><p>Top segments by illustrative disruption count in the last 90 days</p></div></div><div id="hotspot-history-chart" class="hotspot-chart" role="list" aria-label="Top segments by illustrative disruption count"></div></section><section class="card hotspot-forecast-card"><div class="card__header"><div><h2>Hourly risk forecast</h2><p id="hotspot-selected-label"></p></div><label class="field hotspot-segment-picker"><span>Segment</span><select id="hotspot-segment"></select></label></div><div id="hotspot-risk-chart" class="hotspot-chart"></div><div class="hotspot-current-facts" id="hotspot-current-facts"></div><a class="button button--subtle" id="hotspot-open-segment">Open segment details</a></section></div>' +
      '<section class="card hotspot-table-card"><div class="card__header"><div><h2>Segment history</h2><p>Search, filter by main cause, or sort historical measures.</p></div></div><div id="hotspot-table"></div></section>';

    const picker = FDT.$("#hotspot-segment", root);
    segments.forEach(function (segment) {
      const option = document.createElement("option");
      option.value = segment.id;
      option.textContent = segment.id + " · " + segment.name;
      picker.append(option);
    });
    picker.value = selectedSegmentId;

    const historyChart = FDT.$("#hotspot-history-chart", root);
    const maxDisruptions = top.length ? top[0].disruptions : 1;
    top.forEach(function (item) {
      const anchor = document.createElement("a");
      anchor.className = "hotspot-history-row";
      anchor.href = "#/segment/" + encodeURIComponent(item.id);
      anchor.setAttribute("aria-label", item.id + " · " + item.name + " · " + item.disruptions + " disruptions in 90 days");
      const label = document.createElement("span");
      label.className = "hotspot-history-row__label";
      label.textContent = item.id + " · " + item.name;
      const track = document.createElement("span");
      track.className = "hotspot-history-row__track";
      const bar = document.createElement("span");
      bar.className = "hotspot-history-row__bar";
      bar.style.width = (item.disruptions / maxDisruptions * 100) + "%";
      track.append(bar);
      const count = document.createElement("strong");
      count.className = "number";
      count.textContent = String(item.disruptions);
      anchor.append(label, track, count);
      historyChart.append(anchor);
    });

    function renderHourly() {
      const segment = FDT.data.segmentById[picker.value];
      if (!segment || segment.corridorId !== corridor.id) throw new Error("Selected hotspot segment is not in the active corridor.");
      FDT.$("#hotspot-selected-label", root).textContent = segment.id + " · " + segment.name + " · synthetic hourly score";
      const chart = FDT.charts.line({
        values: segment.risk,
        min: 0,
        max: 1,
        threshold: 0.6,
        label: segment.id + " hourly risk forecast, 00:00–23:00 IST"
      });
      FDT.$("#hotspot-risk-chart", root).replaceChildren(chart);
      const historical = byId[segment.id];
      const facts = FDT.$("#hotspot-current-facts", root);
      facts.replaceChildren();
      [
        ["Current risk · 10:00", segment.risk[10].toFixed(2)],
        ["Rain · 10:00", FDT.format.mmHr(segment.rainMmHr[10])],
        ["Past 90-day disruptions", historical.disruptions90d],
        ["Main historical cause", historical.mainCause]
      ].forEach(function (item) {
        const fact = document.createElement("div");
        const label = document.createElement("span");
        label.textContent = item[0];
        const value = document.createElement("strong");
        value.textContent = String(item[1]);
        fact.append(label, value);
        facts.append(fact);
      });
      FDT.$("#hotspot-open-segment", root).href = "#/segment/" + encodeURIComponent(segment.id);
    }

    const causeOptions = Array.from(new Set(rows.map(function (item) { return item.cause; }))).sort();
    const tableRows = rows.map(function (item) {
      return {
        id: item.id,
        name: item.name,
        risk: item.risk,
        disruptions: item.disruptions,
        averageDelay: item.averageDelay,
        cause: item.cause,
        segment: item
      };
    });
    const table = FDT.ui.table({
      searchLabel: "Search hotspot segments",
      searchPlaceholder: "Search segment, location, or cause...",
      filterLabel: "Filter by main cause",
      allLabel: "All causes",
      filters: causeOptions.map(function (cause) { return { value: cause, label: cause }; }),
      filterKey: "cause",
      emptyTitle: "No segments match",
      emptyMessage: "Try a different search or cause.",
      columns: [
        { key: "id", label: "Segment", render: function (_, row) {
          const anchor = document.createElement("a");
          anchor.className = "table-primary-link";
          anchor.href = "#/segment/" + encodeURIComponent(row.id);
          anchor.textContent = row.id + " · " + row.name;
          return anchor;
        } },
        { key: "risk", label: "Risk now", render: function (value, row) {
          const wrap = document.createElement("span");
          const risk = document.createElement("span");
          risk.className = "number";
          risk.textContent = value.toFixed(2);
          wrap.append(risk, document.createTextNode(" "), FDT.ui.badge(value >= 0.6 ? "High" : value >= 0.3 ? "Moderate" : "Low", riskKind(value)));
          return wrap;
        } },
        { key: "disruptions", label: "Disruptions · 90d", render: function (value) { return String(value); } },
        { key: "averageDelay", label: "Average delay", render: function (value) { return FDT.format.min(value); } },
        { key: "cause", label: "Main cause" },
        { key: "open", label: "Open", sortable: false, render: function (_, row) {
          const anchor = document.createElement("a");
          anchor.className = "button button--subtle";
          anchor.href = "#/segment/" + encodeURIComponent(row.id);
          anchor.textContent = "Details";
          return anchor;
        } }
      ],
      rows: tableRows,
      pageSize: 10
    });
    FDT.$("#hotspot-table", root).append(table.element);
    picker.addEventListener("change", renderHourly);
    renderHourly();
    const note = FDT.ui.designNote(1, "Historical disruption counts and hourly forecast risk use separate synthetic inputs.");
    if (note) root.append(note);
  }

  FDT.pages.hotspots = {
    title: "Risk Hotspots",
    render: render,
    destroy: function () {}
  };
}());
