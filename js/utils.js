(function () {
  "use strict";
  window.FDT = window.FDT || {};
  const FDT = window.FDT;

  FDT.$ = function (selector, root) {
    return (root || document).querySelector(selector);
  };
  FDT.$$ = function (selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  };
  FDT.el = function (tag, attributes, children) {
    const node = document.createElement(tag);
    Object.entries(attributes || {}).forEach(function (entry) {
      const key = entry[0];
      const value = entry[1];
      if (key === "className") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value !== null && value !== undefined) node.setAttribute(key, value);
    });
    (Array.isArray(children) ? children : children ? [children] : []).forEach(function (child) {
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return node;
  };
  FDT.format = {
    min: function (value) { return Math.round(Number(value)) + " min"; },
    km: function (value) { return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value)) + " km"; },
    mmHr: function (value) { return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value)) + " mm/hr"; },
    ist: function (date) {
      const value = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(value) + " IST";
    }
  };
  FDT.mulberry32 = function (seed) {
    // A small seeded generator makes simulated results repeatable across runs.
    let value = seed >>> 0;
    return function () {
      value += 0x6D2B79F5;
      let next = value;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  };
  FDT.percentile = function (values, percentile) {
    if (!values.length) return 0;
    const sorted = values.slice().sort(function (a, b) { return a - b; });
    const index = Math.min(sorted.length - 1, Math.max(0, (sorted.length - 1) * percentile));
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  };
  FDT.debounce = function (callback, wait) {
    let timeout;
    return function () {
      const context = this;
      const args = arguments;
      window.clearTimeout(timeout);
      timeout = window.setTimeout(function () { callback.apply(context, args); }, wait);
    };
  };
  FDT.escapeHtml = function (value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  };
}());
