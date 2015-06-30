//tinyMCEPopup.requireLangPack();

//var action, orgTableWidth, orgTableHeight, dom = tinyMCEPopup.editor.dom;

/**
 * ATLASSIAN (scoping function) - there are some functions defined in this block that we don't want to promote to being global functions
 */
(function () {
AJS.$.extend(tinymce.plugins.TablePlugin.prototype, {
insertTable : function(action) {
	var formObj = AJS.$("#tinymce-table-form")[0]; //ATLASSIAN
	var inst = AJS.Rte.getEditor(), dom = inst.dom; //ATLASSIAN
	var cols = 2, rows = 2, border = 0, cellpadding = -1, cellspacing = -1, align, width, height, className = tinymce.settings.confluence_table_style, caption, frame, rules, style = "";
	var html = '', capEl, elm;

	elm = dom.getParent(inst.selection.getNode(), 'table');

    /**
     * Custom ATLASSIAN form fields
     */
    var heading, equalWidthColumns;
    heading = formObj.elements['heading'].checked;
    equalWidthColumns = formObj.elements['equal-width-columns'].checked;

	// Get form data
	cols = formObj.elements['cols'].value;
	rows = formObj.elements['rows'].value;

	width = AJS.$("#tinymce-table-form input[name='width']").val(); //ATLASSIAN

	// Create new table
	html += '<table';

	html += makeAttrib('data-mce-new', '1');

	if (width && inst.settings.inline_styles) {
		if (style)
			style += '; ';

		// Force px
		if (/^[0-9\.]+$/.test(width))
			width += 'px';

		style += 'width: ' + width;
	} else
		html += makeAttrib('width', width);

	html += makeAttrib('class', className);
	html += makeAttrib('style', style);
	html += '>';

	for (var y=0; y<rows; y++) {
		html += "<tr>";

        // ATLASSIAN
		function capitaliseFirstChar(str) {
			return str.charAt(0).toUpperCase() + str.substring(1, str.length);
		}

		for (var x=0; x<cols; x++) {
			var elementName, widthDeclaration, cellClassName;
			if(y == 0 && heading) {
				elementName = "th";
				cellClassName = tinymce.settings.confluence_table_heading_style;
			} else {
				elementName = "td";
				cellClassName = tinymce.settings.confluence_table_cell_style;
			}
			if (equalWidthColumns) {
				widthDeclaration = " width=\"" + (Math.round((100 / cols) * 100) / 100) + "%\"";
			}

			html += "<" + elementName + (widthDeclaration ? widthDeclaration : "") + " class=\"" + cellClassName + "\">";
			if (!tinymce.isIE || tinymce.isIE11) {
				html += "<br data-mce-bogus=\"1\"/>";
			} else if(tinymce.isIE9) {
                html += "&nbsp;"; // ATLASSIAN - CONFDEV-5592
            }
			html += "</" + elementName + ">";
		}

		html += "</tr>";
	}

	html += "</table>";

	// Move table
	if (inst.settings.fix_table_elements) {
		var patt = '';

        //ATLASSIAN
		//inst.focus();
        AJS.Rte.BookmarkManager.restoreBookmark();

		inst.selection.setContent('<br class="_mce_marker" />');

		tinymce.each('h1,h2,h3,h4,h5,h6,p'.split(','), function(n) {
			if (patt)
				patt += ',';

			patt += n + ' ._mce_marker';
		});

		tinymce.each(inst.dom.select(patt), function(n) {
			inst.dom.split(inst.dom.getParent(n, 'h1,h2,h3,h4,h5,h6,p'), n);
		});

		// ATLASSIAN - should be using selection.setContent instead of setOuterHTML to ensure that any selection.onSetContent listeners are called.
		var marker = dom.select('br._mce_marker')[0];
		inst.selection.select(marker);
		inst.selection.setContent(html);

		// ATLASSIAN - clean up the marker if it is still present
		inst.dom.remove(marker);
	} else
		inst.execCommand('mceInsertContent', false, html);

	tinymce.each(dom.select('table[data-mce-new]'), function(node) {
        //ATLASSIAN
		//// Fixes a bug in IE where the caret cannot be placed after the table if the table is at the end of the document
		//if (tinymce.isIE && node.nextSibling == null) {
		//	dom.insertAfter(dom.create('p'), node);
		//}

		//var tdorth = dom.select('td,th', node);

        //ATLASSIAN: puts the cursor in the first row
        //Could possibly use a first-child selector but this is a little more robust if we ever do thead/tbody etc
        var selector = heading ? 'th' : 'td',
            tdorth = dom.select(selector, node);

		try {
			// IE9 might fail to do this selection 
			inst.selection.setCursorLocation(tdorth[0], 0);
		} catch (ex) {
			// Ignore
        }

		dom.setAttrib(node, 'data-mce-new', '');
	});

	inst.addVisual();
	inst.execCommand('mceEndUndoLevel', false, {}, {skip_undo: true});

	//tinyMCEPopup.close();
}
});

function makeAttrib(attrib, value) {
	var formObj = document.forms[0];
	var valueElm = formObj.elements[attrib];

	if (typeof(value) == "undefined" || value == null) {
		value = "";

		if (valueElm)
			value = valueElm.value;
	}

	if (value == "")
		return "";

	// XML encode it
	value = value.replace(/&/g, '&amp;');
	value = value.replace(/\"/g, '&quot;');
	value = value.replace(/</g, '&lt;');
	value = value.replace(/>/g, '&gt;');

	return ' ' + attrib + '="' + value + '"';
}

function init() {
	tinyMCEPopup.resizeToInnerSize();

	document.getElementById('backgroundimagebrowsercontainer').innerHTML = getBrowserHTML('backgroundimagebrowser','backgroundimage','image','table');
	document.getElementById('backgroundimagebrowsercontainer').innerHTML = getBrowserHTML('backgroundimagebrowser','backgroundimage','image','table');
	document.getElementById('bordercolor_pickcontainer').innerHTML = getColorPickerHTML('bordercolor_pick','bordercolor');
	document.getElementById('bgcolor_pickcontainer').innerHTML = getColorPickerHTML('bgcolor_pick','bgcolor');

	var cols = 2, rows = 2, border = tinyMCEPopup.getParam('table_default_border', '0'), cellpadding = tinyMCEPopup.getParam('table_default_cellpadding', ''), cellspacing = tinyMCEPopup.getParam('table_default_cellspacing', '');
	var align = "", width = "", height = "", bordercolor = "", bgcolor = "", className = "";
	var id = "", summary = "", style = "", dir = "", lang = "", background = "", rules = "", frame = "";
	var inst = tinyMCEPopup.editor, dom = inst.dom;
	var formObj = document.forms[0];
	var elm = dom.getParent(inst.selection.getNode(), "table");

	action = tinyMCEPopup.getWindowArg('action');

	if (!action)
		action = elm ? "update" : "insert";

	if (elm && action != "insert") {
		var rowsAr = elm.rows;
		cols = 0;
		for (var i=0; i<rowsAr.length; i++)
			if (rowsAr[i].cells.length > cols)
				cols = rowsAr[i].cells.length;

		rows = rowsAr.length;

		st = dom.parseStyle(dom.getAttrib(elm, "style"));
		border = trimSize(getStyle(elm, 'border', 'borderWidth'));
		cellpadding = dom.getAttrib(elm, 'cellpadding', "");
		cellspacing = dom.getAttrib(elm, 'cellspacing', "");
		width = trimSize(getStyle(elm, 'width', 'width'));
		height = trimSize(getStyle(elm, 'height', 'height'));
		bordercolor = convertRGBToHex(getStyle(elm, 'bordercolor', 'borderLeftColor'));
		bgcolor = convertRGBToHex(getStyle(elm, 'bgcolor', 'backgroundColor'));
		align = dom.getAttrib(elm, 'align', align);
		frame = dom.getAttrib(elm, 'frame');
		rules = dom.getAttrib(elm, 'rules');
		className = tinymce.trim(dom.getAttrib(elm, 'class').replace(/mceItem.+/g, ''));
		id = dom.getAttrib(elm, 'id');
		summary = dom.getAttrib(elm, 'summary');
		style = dom.serializeStyle(st);
		dir = dom.getAttrib(elm, 'dir');
		lang = dom.getAttrib(elm, 'lang');
		background = getStyle(elm, 'background', 'backgroundImage').replace(new RegExp("url\\(['\"]?([^'\"]*)['\"]?\\)", 'gi'), "$1");
		formObj.caption.checked = elm.getElementsByTagName('caption').length > 0;

		orgTableWidth = width;
		orgTableHeight = height;

		action = "update";
		formObj.insert.value = inst.getLang('update');
	}

	addClassesToList('class', "table_styles");
	TinyMCE_EditableSelects.init();

	// Update form
	selectByValue(formObj, 'align', align);
	selectByValue(formObj, 'tframe', frame);
	selectByValue(formObj, 'rules', rules);
	selectByValue(formObj, 'class', className, true, true);
	formObj.cols.value = cols;
	formObj.rows.value = rows;
	formObj.border.value = border;
	formObj.cellpadding.value = cellpadding;
	formObj.cellspacing.value = cellspacing;
	formObj.width.value = width;
	formObj.height.value = height;
	formObj.bordercolor.value = bordercolor;
	formObj.bgcolor.value = bgcolor;
	formObj.id.value = id;
	formObj.summary.value = summary;
	formObj.style.value = style;
	formObj.dir.value = dir;
	formObj.lang.value = lang;
	formObj.backgroundimage.value = background;

	updateColor('bordercolor_pick', 'bordercolor');
	updateColor('bgcolor_pick', 'bgcolor');

	// Resize some elements
	if (isVisible('backgroundimagebrowser'))
		document.getElementById('backgroundimage').style.width = '180px';

	// Disable some fields in update mode
	if (action == "update") {
		formObj.cols.disabled = true;
		formObj.rows.disabled = true;
	}
}

function changedSize() {
	var formObj = document.forms[0];
	var st = dom.parseStyle(formObj.style.value);

/*	var width = formObj.width.value;
	if (width != "")
		st['width'] = tinyMCEPopup.getParam("inline_styles") ? getCSSSize(width) : "";
	else
		st['width'] = "";*/

	var height = formObj.height.value;
	if (height != "")
		st['height'] = getCSSSize(height);
	else
		st['height'] = "";

	formObj.style.value = dom.serializeStyle(st);
}

function isCssSize(value) {
	return /^[0-9.]+(%|in|cm|mm|em|ex|pt|pc|px)$/.test(value);
}

function cssSize(value, def) {
	value = tinymce.trim(value || def);

	if (!isCssSize(value)) {
		return parseInt(value, 10) + 'px';
	}

	return value;
}

function changedBackgroundImage() {
	var formObj = document.forms[0];
	var st = dom.parseStyle(formObj.style.value);

	st['background-image'] = "url('" + formObj.backgroundimage.value + "')";

	formObj.style.value = dom.serializeStyle(st);
}

function changedBorder() {
	var formObj = document.forms[0];
	var st = dom.parseStyle(formObj.style.value);

	// Update border width if the element has a color
	if (formObj.border.value != "" && (isCssSize(formObj.border.value) || formObj.bordercolor.value != ""))
		st['border-width'] = cssSize(formObj.border.value);
	else {
		if (!formObj.border.value) {
			st['border'] = '';
			st['border-width'] = '';
		}
	}

	formObj.style.value = dom.serializeStyle(st);
}

function changedColor() {
	var formObj = document.forms[0];
	var st = dom.parseStyle(formObj.style.value);

	st['background-color'] = formObj.bgcolor.value;

	if (formObj.bordercolor.value != "") {
		st['border-color'] = formObj.bordercolor.value;

		// Add border-width if it's missing
		if (!st['border-width'])
			st['border-width'] = cssSize(formObj.border.value, 1);
	}

	formObj.style.value = dom.serializeStyle(st);
}

function changedStyle() {
	var formObj = document.forms[0];
	var st = dom.parseStyle(formObj.style.value);

	if (st['background-image'])
		formObj.backgroundimage.value = st['background-image'].replace(new RegExp("url\\(['\"]?([^'\"]*)['\"]?\\)", 'gi'), "$1");
	else
		formObj.backgroundimage.value = '';

	if (st['width'])
		formObj.width.value = trimSize(st['width']);

	if (st['height'])
		formObj.height.value = trimSize(st['height']);

	if (st['background-color']) {
		formObj.bgcolor.value = st['background-color'];
		updateColor('bgcolor_pick','bgcolor');
	}

	if (st['border-color']) {
		formObj.bordercolor.value = st['border-color'];
		updateColor('bordercolor_pick','bordercolor');
	}
}

//tinyMCEPopup.onInit.add(init);
})(); // there are some functions defined in this block that we don't want to promote to being global functions
