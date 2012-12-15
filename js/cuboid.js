$(document).ready(function () {

	function makeCube(element_id) {

		var cube = {};
		cube.faces = {};
		cube.show = {};

		var thisCubeId = new Date().getTime().toString();

		var original_element = $(element_id);
		var original_element_parent = original_element.parent();
		var container = original_element.clone();

		var half = parseInt(original_element.width()/2).toString();

		container.addClass("container").html("").appendTo(original_element_parent);

		var cubeHTML = '<div id="#" class="cubes">'.replace("#", thisCubeId);
		var cubeElement = $(cubeHTML);

		cubeElement.appendTo(container);

		var translateZ = ' translateZ(#px)'.replace("#", half);
		var matrix = {
			front: {axis:'X', value:0},
			back: {axis:'X', value:180},
			right: {axis:'Y', value:90},
			left: {axis:'Y', value:-90},
			top: {axis:'X', value:90},
			bottom: {axis:'X', value:-90}
		};

		$.each(matrix, function(k,v) {
			var cssKlass = k + "-" + thisCubeId,
				setup_value = 'rotate' + v.axis + '(' + v.value + 'deg)' + " " +'translateZ(#px)'.replace("#", half),
				setup_rule = '.@ { -webkit-transform: $ }'.replace('@', cssKlass).replace('$', setup_value);
			$.rule(setup_rule).appendTo('style');
			var faceElement = original_element.clone().addClass(cssKlass);
			cube.faces[k] = faceElement;
			faceElement.appendTo(cubeElement);
			var show_value = 'translateZ(#px)'.replace("#", half*-1) + " " + 'rotate' + v.axis + '(' + v.value*-1 + 'deg)',
				show_rule = '.show-@ { -webkit-transform: $ }'.replace('@', cssKlass).replace('$', show_value);
			$.rule(show_rule).appendTo('style');
			cube.show[k] = function() {
				cubeElement.attr("class","cubes").addClass("show-" + cssKlass);
			};
		});

		original_element.remove();

		return cube;

	}

	thingee = makeCube("#facefuck");

	$('.button-face').click(function() {
		var face = $(this).text();
		thingee.show[face]();
	});

	$('.button-test').click(function() {
		alert("Yes!");
	});

	thingee.show['right']();

//	thingee.faces['front'].css({'background':'url(http://userserve-ak.last.fm/serve/300x300/31381233.png)'})
////	thingee.faces['back'].css({'background':'url(http://api.musixmatch.com/images/albums8/7/7/2/3/9/7/13793277_350_350.jpg)'})
//	thingee.faces['top'].css({'background':'url(http://api.musixmatch.com/images/albums8/0/7/6/0/6/2/14260670_350_350.jpg)'})
//	thingee.faces['bottom'].css({'background':'url(http://userserve-ak.last.fm/serve/300x300/12766765.jpg)'})
//	thingee.faces['left'].css({'background':'url(http://api.musixmatch.com/images/albums8/2/9/6/0/5/8/13850692_350_350.jpg)'})
//	thingee.faces['right'].css({'background':'url(http://api.musixmatch.com/images/albums/7/6/4/4/9/5/11594467_350_350.jpg)'})

	var count = 100;
	while (count>0) {
		--count;
		$('<li>Item</li>').appendTo("#myList");
	}

	setTimeout(function() {
		$("#myList").show();
		thingee.show['front']();
	},5000)

//	var count = 0;
//	$.each(thingee.faces, function(k,v) {
//		v.css({
//			'background':'hsla(#, 100%, 50%, 0.7 )'.replace("#",count*60)
//		});
//		++count;
//	});

	/*

	  #cube {
		  width: 100%;
		  height: 100%;
		  position: absolute;
		  -webkit-transform-style: preserve-3d;
	  }

	  #cube .front { -webkit-transform: rotateY(0deg) translateZ(100px); }
	  #cube .back { -webkit-transform: rotateX(180deg) translateZ(100px); }
	  #cube .right { -webkit-transform: rotateY(90deg) translateZ(100px); }
	  #cube .left { -webkit-transform: rotateY(-90deg) translateZ(100px); }
	  #cube .top { -webkit-transform: rotateX(90deg) translateZ(100px); }
	  #cube .bottom { -webkit-transform: rotateX(-90deg) translateZ(100px); }

	  */


});