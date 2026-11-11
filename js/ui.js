(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};

  function makeButton(text, className, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className || "button";
    button.textContent = text;
    if (action) button.addEventListener("click", action);
    return button;
  }

  function focusableWithin(container) {
    return Array.from(container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(function (element) { return !element.hidden && element.getAttribute("aria-hidden") !== "true"; });
  }

  function openOverlay(options) {
    const overlay = document.createElement("div");
    overlay.className = options.drawer ? "drawer-backdrop" : "modal-backdrop";
    const panel = document.createElement("section");
    panel.className = options.drawer ? "drawer" : "modal";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "fdt-dialog-title");
    const header = document.createElement("header");
    header.className = "modal__header";
    const title = document.createElement("h2");
    title.id = "fdt-dialog-title";
    title.textContent = options.title || (options.drawer ? "Details" : "Confirmation");
    header.append(title);
    const closeButton = makeButton("Close", "button button--icon", close);
    closeButton.setAttribute("aria-label", "Close dialog");
    header.append(closeButton);
    const body = document.createElement("div");
    body.className = "modal__body";
    if (options.content instanceof Node) body.append(options.content);
    else body.textContent = options.content || "";
    panel.append(header, body);
    if (options.footer) {
      const footer = document.createElement("footer");
      footer.className = "modal__footer";
      if (options.footer instanceof Node) footer.append(options.footer);
      else footer.textContent = options.footer;
      panel.append(footer);
    }
    overlay.append(panel);
    const previousFocus = document.activeElement;
    let active = true;
    let closeListeners = [];

    function close() {
      if (!active) return;
      active = false;
      document.removeEventListener("keydown", handleKeydown, true);
      overlay.remove();
      closeListeners.forEach(function (listener) { listener(); });
      if (previousFocus && typeof previousFocus.focus === "function" && document.contains(previousFocus)) previousFocus.focus();
    }
    function handleKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusableWithin(panel);
      if (!items.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    overlay.addEventListener("mousedown", function (event) {
      if (event.target === overlay && options.closeOnBackdrop !== false) close();
    });
    document.addEventListener("keydown", handleKeydown, true);
    document.body.append(overlay);
    const first = options.initialFocus || panel.querySelector("[autofocus]") || panel.querySelector("button, a[href], input, select, textarea");
    if (!first) panel.tabIndex = -1;
    (first || panel).focus();
    return {
      element: panel,
      close: close,
      onClose: function (listener) { closeListeners.push(listener); }
    };
  }

  FDT.ui = {
    modal: function (options) { return openOverlay(options || {}); },
    confirm: function (message, options) {
      const settings = options || {};
      return new Promise(function (resolve) {
        const content = document.createElement("p");
        content.textContent = message;
        const handle = openOverlay({
          title: settings.title || "Please confirm",
          content: content,
          closeOnBackdrop: false
        });
        const footer = document.createElement("div");
        footer.className = "modal__footer";
        const cancel = makeButton(settings.cancelText || "Cancel", "button");
        const confirm = makeButton(settings.confirmText || "Confirm", "button " + (settings.danger ? "button--danger" : "button--primary"));
        footer.append(cancel, confirm);
        handle.element.append(footer);
        let answered = false;
        function finish(value) {
          if (answered) return;
          answered = true;
          handle.close();
          resolve(value);
        }
        cancel.addEventListener("click", function () { finish(false); });
        confirm.addEventListener("click", function () { finish(true); });
        handle.onClose(function () {
          if (!answered) {
            answered = true;
            resolve(false);
          }
        });
      });
    },
    drawer: function (options) {
      const handle = openOverlay(Object.assign({}, options || {}, { drawer: true }));
      return handle;
    },
    toast: function (message, options) {
      const region = document.querySelector("#toast-region");
      if (!region) return null;
      const toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", (options && options.role) || "status");
      toast.textContent = message;
      region.append(toast);
      const duration = options && Number(options.duration) || 3200;
      window.setTimeout(function () { toast.remove(); }, duration);
      return toast;
    },
    tabs: function (container, onChange) {
      if (!container) return;
      const tabs = Array.from(container.querySelectorAll('[role="tab"], .tab-button'));
      function activate(tab, moveFocus) {
        tabs.forEach(function (item) {
          const selected = item === tab;
          item.setAttribute("aria-selected", String(selected));
          item.tabIndex = selected ? 0 : -1;
          const panelId = item.getAttribute("aria-controls");
          const panel = panelId && document.getElementById(panelId);
          if (panel) panel.hidden = !selected;
        });
        if (moveFocus) tab.focus();
        if (typeof onChange === "function") onChange(tab);
      }
      tabs.forEach(function (tab, index) {
        tab.setAttribute("role", "tab");
        tab.tabIndex = tab.getAttribute("aria-selected") === "true" || index === 0 ? 0 : -1;
        tab.addEventListener("click", function () { activate(tab, false); });
        tab.addEventListener("keydown", function (event) {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 :
            (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
          activate(tabs[next], true);
        });
      });
      const selected = tabs.find(function (tab) { return tab.getAttribute("aria-selected") === "true"; }) || tabs[0];
      if (selected) activate(selected, false);
    },
    table: function (options) {
      const settings = options || {};
      const columns = settings.columns || [];
      let rows = (settings.rows || []).slice();
      const pageSize = Math.max(1, Number(settings.pageSize) || 8);
      let page = 0;
      let sortKey = "";
      let sortDirection = 1;
      let query = "";
      let filterValue = "";
      const root = document.createElement("div");
      root.className = "table-widget";
      const toolbar = document.createElement("div");
      toolbar.className = "table-toolbar";
      const search = document.createElement("input");
      search.type = "search";
      search.className = "input-control table-search";
      search.setAttribute("aria-label", settings.searchLabel || "Search table");
      search.placeholder = settings.searchPlaceholder || "Search";
      const filter = settings.filters && settings.filters.length ? document.createElement("select") : null;
      if (filter) {
        filter.className = "select-control table-filter";
        filter.setAttribute("aria-label", settings.filterLabel || "Filter table");
        const all = document.createElement("option");
        all.value = "";
        all.textContent = settings.allLabel || "All";
        filter.append(all);
        settings.filters.forEach(function (item) {
          const option = document.createElement("option");
          option.value = item.value;
          option.textContent = item.label;
          filter.append(option);
        });
        toolbar.append(filter);
        filter.addEventListener("change", function () { filterValue = filter.value; page = 0; draw(); });
      }
      toolbar.append(search);
      root.append(toolbar);
      const tableWrap = document.createElement("div");
      tableWrap.className = "table-wrap";
      const table = document.createElement("table");
      table.className = "data-table";
      const thead = document.createElement("thead");
      const tbody = document.createElement("tbody");
      table.append(thead, tbody);
      tableWrap.append(table);
      root.append(tableWrap);
      const pager = document.createElement("div");
      pager.className = "table-pager";
      root.append(pager);

      function draw() {
        thead.replaceChildren();
        tbody.replaceChildren();
        const head = document.createElement("tr");
        columns.forEach(function (column) {
          const th = document.createElement("th");
          th.scope = "col";
          if (column.sortable !== false) {
            const button = makeButton(column.label, "table-sort");
            button.setAttribute("aria-label", "Sort by " + column.label);
            if (sortKey === column.key) button.textContent += sortDirection === 1 ? " ↑" : " ↓";
            button.addEventListener("click", function () {
              if (sortKey === column.key) sortDirection *= -1;
              else { sortKey = column.key; sortDirection = 1; }
              draw();
            });
            th.append(button);
          } else th.textContent = column.label;
          head.append(th);
        });
        thead.append(head);
        let filtered = rows.filter(function (row) {
          const matchesQuery = !query || columns.some(function (column) {
            return String(row[column.key] === undefined ? "" : row[column.key]).toLowerCase().includes(query);
          });
          const matchesFilter = !filterValue || !settings.filterKey || String(row[settings.filterKey]) === filterValue;
          return matchesQuery && matchesFilter;
        });
        if (sortKey) {
          filtered.sort(function (a, b) {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (typeof av === "number" && typeof bv === "number") return (av - bv) * sortDirection;
            return String(av === undefined ? "" : av).localeCompare(String(bv === undefined ? "" : bv), undefined, { numeric: true }) * sortDirection;
          });
        }
        const count = filtered.length;
        const pageCount = Math.max(1, Math.ceil(count / pageSize));
        page = Math.min(page, pageCount - 1);
        const visible = filtered.slice(page * pageSize, (page + 1) * pageSize);
        visible.forEach(function (row) {
          const tr = document.createElement("tr");
          columns.forEach(function (column) {
            const td = document.createElement("td");
            td.setAttribute("data-label", column.label);
            const value = typeof column.render === "function" ? column.render(row[column.key], row) : row[column.key];
            if (value instanceof Node) td.append(value);
            else if (value !== undefined && value !== null) td.textContent = String(value);
            tr.append(td);
          });
          tbody.append(tr);
        });
        if (!visible.length) {
          const tr = document.createElement("tr");
          const td = document.createElement("td");
          td.colSpan = Math.max(1, columns.length);
          td.append(FDT.ui.emptyState(settings.emptyTitle || "No matching items", settings.emptyMessage || "Try changing the search or filter."));
          tr.append(td);
          tbody.append(tr);
        }
        pager.replaceChildren();
        const status = document.createElement("span");
        status.className = "muted";
        status.textContent = count ? "Showing " + (page * pageSize + 1) + "–" + Math.min((page + 1) * pageSize, count) + " of " + count : "0 results";
        const previous = makeButton("Previous", "button", function () { page = Math.max(0, page - 1); draw(); });
        const next = makeButton("Next", "button", function () { page = Math.min(pageCount - 1, page + 1); draw(); });
        previous.disabled = page === 0;
        next.disabled = page >= pageCount - 1;
        pager.append(status, previous, next);
      }
      search.addEventListener("input", FDT.debounce(function () { query = search.value.trim().toLowerCase(); page = 0; draw(); }, 120));
      draw();
      return {
        element: root,
        setRows: function (nextRows) { rows = nextRows.slice(); page = 0; draw(); },
        refresh: draw
      };
    },
    badge: function (label, kind) {
      const badge = document.createElement("span");
      badge.className = "pill pill--" + (kind || "neutral");
      badge.textContent = label;
      return badge;
    },
    emptyState: function (title, message, action) {
      const state = document.createElement("div");
      state.className = "empty-state";
      const heading = document.createElement("h3");
      heading.textContent = title || "Nothing to show yet";
      const description = document.createElement("p");
      description.textContent = message || "There are no items here right now.";
      state.append(heading, description);
      if (action instanceof Node) state.append(action);
      return state;
    },
    designNote: function (number, message) {
      if (!FDT.state || !FDT.state.preferences.designNotes) return null;
      const note = document.createElement("aside");
      note.className = "design-note";
      note.textContent = number + " · " + message;
      note.setAttribute("aria-label", "Design note " + number + ": " + message);
      return note;
    }
  };
}());
