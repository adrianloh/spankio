Spank.utils.randrange = function(minVal,maxVal,floatVal) {
	var randVal = minVal+(Math.random()*(maxVal-minVal));
	return typeof floatVal=='undefined'?Math.round(randVal):randVal.toFixed(floatVal);
};

Spank.utils.wobble = function(elem, min, max) {
	var rotate = "rotate(#deg)".replace("#", Spank.utils.randrange(min,max));
	$(elem).css("webkit-transform",rotate).removeClass("unwobbled");
};

Spank.utils.padToFour = function(number) {
	if (number<=9999) { number = ("000"+number).slice(-4); }
	return number;
};

Spank.utils.randomHexColor = function() {
	return '#'+Math.floor(Math.random()*16777215).toString(16);
};

Spank.utils.toFirebaseName = function(name) {
	if (typeof(name)==='number') {
		name = "fbuid_" + JSON.stringify(name)
	}
	return name.replace(/[\.#\$\[\]]/g,"_");
};