(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  FDT.pages = FDT.pages || {};
  FDT.pages.preferences = {
    title: "Preferences",
    render: function (root) { FDT.renderPageStub(root, "Preferences", "Set corridor defaults, theme, wireframe mode and prototype settings."); },
    destroy: function () {}
  };
}());
