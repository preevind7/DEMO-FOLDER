(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  FDT.pages = FDT.pages || {};
  FDT.pages.profile = {
    title: "Profile",
    render: function (root) { FDT.renderPageStub(root, "Profile", "Manage your prototype profile, notification preferences and watched segments."); },
    destroy: function () {}
  };
}());
