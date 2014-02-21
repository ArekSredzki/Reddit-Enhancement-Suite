modules['imageUpload'] = {
	moduleID: 'imageUpload',
	moduleName: 'Image uploader',
	category: 'Posts',
	options: {
		preferredHost: {
			type: 'enum',
			value: 'random',
			values: [{
				name: 'Random',
				value: 'random'
			}, {
				name: 'CloudPix.co',
				value: 'cloudpix'
			}, {
				name: 'Imgur',
				value: 'imgur'
			}],
			description: 'Select your preferred image host (It will be autoselected but you can still change it on the page).'
		}
	},
	description: 'Quickly and easily upload images right from the submit page.',
	isEnabled: function() {
		return RESConsole.getModulePrefs(this.moduleID);
	},
	include: [
		/^https?:\/\/([a-z]+)\.reddit\.com\/r\/[-\w\.]*\/submit\/?/i,
		/^https?:\/\/([a-z]+)\.reddit\.com\/submit\/?/i
	],
	isMatchURL: function() {
		return RESUtils.isMatchURL(this.moduleID);
	},
	go: function() {
		if ((this.isEnabled()) && (this.isMatchURL())) {

			var hostJson
			$.ajax({
			  url: 'http://cloudpix.co/api/res_hosts',
			  async: false,
			  dataType: 'json',
			  success: function (json) {
			    hostJson = json;
			  }
			});

			var selected = this.options.preferredHost.value;

			if (selected == 'random') {
				selected = hostJson.hosts[Math.floor(Math.random() * (hostJson.hosts.length))].id;
			}
			var selectedHost = $.grep(hostJson.hosts, function(e){ return e.id === selected; });
			var selectedHost = selectedHost[0];


			$("#url-field").append( "<div> <span class='title'>image</span> <div class='roundfield-content'> <form id='imageUpload'>"+
							"<div id='fine-uploader' style='font-size:14px;'></div>"+
							"<select form='imageUpload' id='host' name='host'>"+
							"</select>&nbsp;&nbsp;&nbsp;"+
							"<span style='font-size:14px;'>By uploading to this host you accept <a href='"+selectedHost.options.termsURL+"' id='host-terms'>these terms</a>.</span>"+
						"<form> </div> </div>"+
						'<script type="text/template" id="qq-template"><div class="qq-uploader-selector qq-uploader"><div class="qq-upload-drop-area-selector qq-upload-drop-area" qq-hide-dropzone><span>Drop files here to upload</span></div><div class="qq-upload-button-selector qq-upload-button"><div>Upload a file</div></div><span class="qq-drop-processing-selector qq-drop-processing"><span>Processing dropped files...</span><span class="qq-drop-processing-spinner-selector qq-drop-processing-spinner"></span></span><ul class="qq-upload-list-selector qq-upload-list"><li><div class="qq-progress-bar-container-selector"><div class="qq-progress-bar-selector qq-progress-bar"></div></div><span class="qq-upload-spinner-selector qq-upload-spinner"></span><span class="qq-edit-filename-icon-selector qq-edit-filename-icon"></span><span class="qq-upload-file-selector qq-upload-file"></span><input class="qq-edit-filename-selector qq-edit-filename" tabindex="0" type="text"><span class="qq-upload-size-selector qq-upload-size"></span><a class="qq-upload-cancel-selector qq-upload-cancel" href="#">Cancel</a><a class="qq-upload-retry-selector qq-upload-retry" href="#">Retry</a><a class="qq-upload-delete-selector qq-upload-delete" href="#">Delete</a><span class="qq-upload-status-text-selector qq-upload-status-text"></span></li></ul></div></script>' );


			$.each(hostJson.hosts, function (index, value) {
				if (value.id == selected)
					$("#host").append('<option value="' + value.id + '" selected>' + value.name + '</option>');
				else
					$("#host").append('<option value="' + value.id + '">' + value.name + '</option>');
			});

			$(document).ready(function (){
				$("#fine-uploader").fineUploader({
            		debug: true,
					request:{
						inputName:"userfile",
						endpoint: selectedHost.options.APIURL
					}
				});
			});

			$("#fine-uploader").on("complete", function(event, id, name, response) {
			    if (response.success) {
			        $("#url").attr("value", response.imagePage);
			        fetch_title();
			    }
			});

			$('#host').on('change', function(){
				selected = $(this).val();
				selectedHost = $.grep(hostJson.hosts, function(e){ return e.id == selected; });
				selectedHost = selectedHost[0];
		        $("#host-terms").attr("href", selectedHost.options.termsURL);
				$("#fine-uploader").fineUploader({
            		debug: true,
					request:{
						inputName:"userfile",
						endpoint: selectedHost.options.APIURL
					}
				});
			});
		}
	}
};