(function() {

	$(document).ready(function() {

		ko.bindingHandlers.cartDeleteIcons = {
			init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				$(element).mouseover(function mousein() {
					$(this).parent().find(".tweetDelete").show();
					$(this).parent().find(".tweetDownload").show();
				}).mouseout(function() {
					$(this).parent().find(".tweetDelete").hide();
					$(this).parent().find(".tweetDownload").hide();
				});
			}
		};

		ko.bindingHandlers.pickupStreamItems = {
			init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				$(element).draggable({
//					handle:'.tweetThumb',
					appendTo: 'body',
					containment: 'window',
					scroll: false,
					helper: 'clone',
					revert: 'invalid',
					cursor: '-webkit-grabbing',
					zIndex:999,
					start:function( event ) {
					},
					drag:function( event ){
					},
					stop:function( event ){
					}
				});
			},
			update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				// This will be called once when the binding is first applied to an element,
				// and again whenever the associated observable changes value.
				// Update the DOM element based on the supplied values here.
			}
		};

		$( ".ui360" ).droppable({
			accept: ".tweetThumb",
			drop: function( event, ui ) {
				console.log(ui);
			}
		});

	});

})();



