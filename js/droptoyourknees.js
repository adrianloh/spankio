Dropzone.autoDiscover = false;

$(document).ready(function() {

	$(document).one("baseReady", function() {

		// Refer to: http://www.dropzonejs.com/#configure

		var server = "@aspasia",
			uploadServer = Spank.servers[server],
			keyBase = Spank.username + "/",
			uploadZone,
			options = {
				url: Spank.alembic.getUploadServer(),
				maxFilesize: 200,
				acceptedFiles: ".m4a, .mp3, .ogg",
				parallelUploads: 2
			};

		uploadZone = new Dropzone("#my-awesome-dropzone", options);

		$("#closeUploadZone").click(function() {
			$(".dropzoneContainer").hide();
		});

		Spank.dropBabyDrop = function() {
			$(".dropzoneContainer").show();
		};

		uploadZone.on("sending", function(file, xhr, formData) {
			file.uuidName = "AAAAA-" + Spank.utils.guid().replace(/-/g,"") + ".ogg";
			formData.append("server", uploadServer);
			formData.append("format", "opus");
			formData.append("s3key", keyBase + file.uuidName);
		});

		uploadZone.on("success", function(file, xhr) {
			if (file.hasOwnProperty('songData') && file.hasOwnProperty("uuidName")) {
				var koo = {}, songData = file.songData;
				["artist", "title"].forEach(function(p) {
					if (typeof(songData[p])==='undefined' && xhr[p]!==null) {
						koo[p] = xhr[p];
					} else {
						koo[p] = songData[p];
					}
				});
				koo.thumb = "http://d1vkkvxpc2ia6t.cloudfront.net/albumempty4.png";
				koo.url = server + ":::" + Spank.username + "/" + file.uuidName;
				koo.direct = uploadServer + "/" + keyBase + file.uuidName;
				Spank.lightBox.addSongToStream(koo);
				uploadZone.removeFile(file);
			} else {
				console.error("File uploaded but file doesn't contain info. Cannot inject into stream.");
				console.error(file);
			}

		});

	});

});