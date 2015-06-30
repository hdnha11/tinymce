/**
 * ForceBlocks.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://tinymce.moxiecode.com/license
 * Contributing: http://tinymce.moxiecode.com/contributing
 */

(function(tinymce) {
	// Shorten names
	var Event = tinymce.dom.Event,
		isIE = tinymce.isIE,
		isGecko = tinymce.isGecko,
		isOpera = tinymce.isOpera,
		each = tinymce.each,
		extend = tinymce.extend,
		TRUE = true,
		FALSE = false;

	function cloneFormats(node) {
		var clone, temp, inner;

		do {
			if (/^(SPAN|STRONG|B|EM|I|FONT|STRIKE|U)$/.test(node.nodeName)) {
				if (clone) {
					temp = node.cloneNode(false);
					temp.appendChild(clone);
					clone = temp;
				} else {
					clone = inner = node.cloneNode(false);
				}

				clone.removeAttribute('id');
			}
		} while (node = node.parentNode);

		if (clone)
			return {wrapper : clone, inner : inner};
	};

	// Checks if the selection/caret is at the end of the specified block element
	function isAtEnd(rng, par) {
		var rng2 = par.ownerDocument.createRange();

		rng2.setStart(rng.endContainer, rng.endOffset);
		rng2.setEndAfter(par);

		// Get number of characters to the right of the cursor if it's zero then we are at the end and need to merge the next block element
		return rng2.cloneContents().textContent.length == 0;
	};

	function splitList(selection, dom, li) {
		var listBlock, block;

		if (dom.isEmpty(li)) {
			listBlock = dom.getParent(li, 'ul,ol');

			if (!dom.getParent(listBlock.parentNode, 'ul,ol')) {
				dom.split(listBlock, li);
				block = dom.create('p', 0, '<br data-mce-bogus="1" />');
				dom.replace(block, li);
				selection.select(block, 1);
			}

			// ATLASSIAN - CONFDEV-3749 - make sure new element is visible
			AJS.Rte.showSelection();

			return FALSE;
		}

		return TRUE;
	};

	/**
	 * This is a internal class and no method in this class should be called directly form the out side.
	 */
	tinymce.create('tinymce.ForceBlocks', {
		ForceBlocks : function(ed) {
			var t = this, s = ed.settings, elm;

			t.editor = ed;
			t.dom = ed.dom;
			elm = (s.forced_root_block || 'p').toLowerCase();
			s.element = elm.toUpperCase();

			ed.onPreInit.add(t.setup, t);
		},

		setup : function() {
			var t = this, ed = t.editor, s = ed.settings, dom = ed.dom, selection = ed.selection, blockElements = ed.schema.getBlockElements();

			// Force root blocks
			if (s.forced_root_block) {
				function addRootBlocks() {
					//ATLASSIAN - CONFDEV-6096/CONFDEV-6478/others - Call getRoot instead of just grabbing the body
					var node = selection.getStart(), rootNode = dom.getRoot(), body = ed.getDoc().body, rng, startContainer, startOffset, endContainer, endOffset, rootBlockNode, tempNode, offset = -0xFFFFFF;

					function isValidNode(node) {
						return (node && node.nodeType === 1);
					}

					if(!isValidNode(node)) {
						return;
					}

					// Check if node is wrapped in block
					while (node != rootNode) {
						if(isValidNode(node)) {
							if (blockElements[node.nodeName]) {
								return;
							}
							node = node.parentNode;
						} else {
							return;
						}
					}

					// Get current selection
					rng = selection.getRng();
					if (rng.setStart) {
						startContainer = rng.startContainer;
						startOffset = rng.startOffset;
						endContainer = rng.endContainer;
						endOffset = rng.endOffset;
					} else {
						// Force control range into text range
						if (rng.item) {
							rng = ed.getDoc().body.createTextRange();
							rng.moveToElementText(rng.item(0));
						}

						tmpRng = rng.duplicate();
						tmpRng.collapse(true);
						startOffset = tmpRng.move('character', offset) * -1;

						if (!tmpRng.collapsed) {
							tmpRng = rng.duplicate();
							tmpRng.collapse(false);
							endOffset = (tmpRng.move('character', offset) * -1) - startOffset;
						}
					}

					// Wrap non block elements and text nodes
					for (node = rootNode.firstChild; node; node) {
						if (node.nodeType === 3 || (node.nodeType == 1 && !blockElements[node.nodeName])) {
							if (!rootBlockNode) {
								rootBlockNode = dom.create(s.forced_root_block);
								node.parentNode.insertBefore(rootBlockNode, node);
							}

							tempNode = node;
							node = node.nextSibling;
							rootBlockNode.appendChild(tempNode);
						} else {
							rootBlockNode = null;
							node = node.nextSibling;
						}
					}

					if (rng.setStart) {
						rng.setStart(startContainer, startOffset);
						rng.setEnd(endContainer, endOffset);
						selection.setRng(rng);
					} else {
						try {
							rng = body.createTextRange();
							//ATLASSIAN - CONFDEV-7363/CONFDEV-7364 - Move selection back as far as possible before moving it to offsets
							rng.moveToElementText(body);
							rng.move('character', offset);
							rng.collapse(true);
							rng.moveStart('character', startOffset);

							if (endOffset > 0)
								rng.moveEnd('character', endOffset);

							rng.select();
						} catch (ex) {
							// Ignore
						}
					}

					ed.nodeChanged();
				};

				ed.onKeyUp.add(addRootBlocks);
				// ATLASSIAN CONFDEV-8468
				// We also need to addRootBlocks on KeyDown because code is sometimes
				// triggered by a keyPress that occurs before the keyUp event of the
				// previous keystroke. We want to make sure that root blocks are in
				// place by the time such code is executed (e.g. autoformat handlers)
				ed.onKeyDown.add(addRootBlocks);
				ed.onClick.add(addRootBlocks);
			}

			if (s.force_br_newlines) {
				// Force IE to produce BRs on enter
				if (isIE) {
					ed.onKeyPress.add(function(ed, e) {
						var n;

						if (e.keyCode == 13 && selection.getNode().nodeName != 'LI') {
							selection.setContent('<br id="__" /> ', {format : 'raw'});
							n = dom.get('__');
							n.removeAttribute('id');
							selection.select(n);
							selection.collapse();
							return Event.cancel(e);
						}
					});
				}
			}

			if (s.force_p_newlines) {
				if (!isIE) {
					ed.onKeyPress.add(function(ed, e) {
						if (e.keyCode == 13 && !e.shiftKey && !t.insertPara(e))
							Event.cancel(e);
					});
				}

/*
 * ATLASSIAN - the code below doesn't seem to be necessary for correct new line and formatting behaviour
 * for IE8 and later versions. This code creates CONFDEV-9088 which is actually more generic than inline
 * tasks alone.
 *
 * Hitting enter after any list item containing a child element such as a span (for text colour,
 * carried over from the inline task placeholder, etc.) isn't able to escape the list. This bug is currently
 * reproducible in the tinyMCE demo.
 */
//                else {
//					// Ungly hack to for IE to preserve the formatting when you press
//					// enter at the end of a block element with formatted contents
//					// This logic overrides the browsers default logic with
//					// custom logic that enables us to control the output
//					tinymce.addUnload(function() {
//						t._previousFormats = 0; // Fix IE leak
//					});
//
//					ed.onKeyPress.add(function(ed, e) {
//						t._previousFormats = 0;
//
//						// Clone the current formats, this will later be applied to the new block contents
//						if (e.keyCode == 13 && !e.shiftKey && ed.selection.isCollapsed() && s.keep_styles) {
//							t._previousFormats = cloneFormats(ed.selection.getStart());
//                        }
//					});
//
//					ed.onKeyUp.add(function(ed, e) {
//						// Let IE break the element and the wrap the new caret location in the previous formats
//						if (e.keyCode == 13 && !e.shiftKey) {
//							var parent = ed.selection.getStart(), fmt = t._previousFormats;
//
//							// Parent is an empty block
//							if (!parent.hasChildNodes() && fmt) {
//								parent = dom.getParent(parent, dom.isBlock);
//
//								if (parent && parent.nodeName != 'LI') {
//                                    parent.innerHTML = '';
//
//                                    if (t._previousFormats) {
//                                        parent.appendChild(fmt.wrapper);
//                                        fmt.inner.innerHTML = '\uFEFF';
//                                    } else
//                                        parent.innerHTML = '\uFEFF';
//
//                                    selection.select(parent, 1);
//                                    selection.collapse(true);
//                                    ed.getDoc().execCommand('Delete', false, null);
//                                    t._previousFormats = 0;
//								}
//							}
//						}
//					});
//				}

				if (isGecko) {
					ed.onKeyDown.add(function(ed, e) {
						if ((e.keyCode == 8 || e.keyCode == 46) && !e.shiftKey)
							t.backspaceDelete(e, e.keyCode == 8);
					});
				}
			}

			// Workaround for missing shift+enter support, http://bugs.webkit.org/show_bug.cgi?id=16973
			if (tinymce.isWebKit) {
				function insertBr(ed) {
					var rng = selection.getRng(), br, div = dom.create('div', null, ' '), divYPos, divHeight, vpPos = dom.getViewPort(ed.getWin());

					// Insert BR element
					rng.insertNode(br = dom.create('br'));

					// Place caret after BR
					rng.setStartAfter(br);
					rng.setEndAfter(br);
					selection.setRng(rng);

					// Could not place caret after BR then insert an nbsp entity and move the caret
					if (selection.getSel().focusNode == br.previousSibling) {
						selection.select(dom.insertAfter(dom.doc.createTextNode('\u00a0'), br));
						selection.collapse(TRUE);
					}

					// Create a temporary DIV after the BR and get the position as it
					// seems like getPos() returns 0 for text nodes and BR elements.
					dom.insertAfter(div, br);
					divYPos = dom.getPos(div).y;
					divHeight = dom.getSize(div).h;
					dom.remove(div);

					// Scroll to new position, scrollIntoView can't be used due to bug: http://bugs.webkit.org/show_bug.cgi?id=16117
					var divBottom = divYPos + divHeight;
					var vpBottom = vpPos.y + vpPos.h;
					if (divBottom > vpBottom) // It is not necessary to scroll if the DIV is inside the view port.
						ed.getWin().scrollTo(0, divBottom - vpPos.h);
				};

				ed.onKeyPress.add(function(ed, e) {
					if (e.keyCode == 13 && (e.shiftKey || (s.force_br_newlines && !dom.getParent(selection.getNode(), 'h1,h2,h3,h4,h5,h6,ol,ul')))) {
						insertBr(ed);
						Event.cancel(e);
					}
				});
			}

			// IE specific fixes
			if (isIE) {
				// Replaces IE:s auto generated paragraphs with the specified element name
				if (s.element != 'P') {
					ed.onKeyPress.add(function(ed, e) {
						t.lastElm = selection.getNode().nodeName;
					});

					ed.onKeyUp.add(function(ed, e) {
						var bl, n = selection.getNode(), b = ed.getBody();

						if (b.childNodes.length === 1 && n.nodeName == 'P') {
							n = dom.rename(n, s.element);
							selection.select(n);
							selection.collapse();
							ed.nodeChanged();
						} else if (e.keyCode == 13 && !e.shiftKey && t.lastElm != 'P') {
							bl = dom.getParent(n, 'p');

							if (bl) {
								dom.rename(bl, s.element);
								ed.nodeChanged();
							}
						}
					});
				}
			}
		},

		getParentBlock : function(n) {
			var d = this.dom;

			return d.getParent(n, d.isBlock);
		},

		insertPara : function(e) {
			var t = this, ed = t.editor, dom = ed.dom, d = ed.getDoc(), se = ed.settings, s = ed.selection.getSel(), r = s.getRangeAt(0), b = d.body;
			var rb, ra, dir, sn, so, en, eo, sb, eb, bn, bef, aft, sc, ec, n, vp = dom.getViewPort(ed.getWin()), y, ch, car;

			ed.undoManager.beforeChange();

			// If root blocks are forced then use Operas default behavior since it's really good
// Removed due to bug: #1853816
//			if (se.forced_root_block && isOpera)
//				return TRUE;

			// Setup before range
			rb = d.createRange();

			// If is before the first block element and in body, then move it into first block element
			rb.setStart(s.anchorNode, s.anchorOffset);
			rb.collapse(TRUE);

			// Setup after range
			ra = d.createRange();

			// If is before the first block element and in body, then move it into first block element
			ra.setStart(s.focusNode, s.focusOffset);
			ra.collapse(TRUE);

			// Setup start/end points
			dir = rb.compareBoundaryPoints(rb.START_TO_END, ra) < 0;
			sn = dir ? s.anchorNode : s.focusNode;
			so = dir ? s.anchorOffset : s.focusOffset;
			en = dir ? s.focusNode : s.anchorNode;
			eo = dir ? s.focusOffset : s.anchorOffset;

			/**
			 * ATLASSIAN: Fix CONF-18922 (must be before the fix below regarding a start node of TD or TH).
			 *
			 * Hitting ENTER when the cursor is after a table in webkit should not send the cursor to the top of the page.
			 *
			 * The reason why this occurs is because this function (i.e. insertPara) considers a range with startContainer
			 * equal to the BODY element to be illegal and accordingly "adjusts" this by setting the startContainer to
			 * the first child of the BODY element (explaining why the cursor jumps to the top).
			 *
			 * Bypass this with this code.
			 *
			 * NOTE: as long as the fix still exists regarding TD or TH's directly below this, this code should come before.
			 * This will another issue which happens when you hit ENTER after a table "nested inside a table cell" (i.e.
			 * You would get this markup: <p>foo<table />bar</p><p>THIS IS THE NEW PARAGRAPH inserted by insertPara</p>).
			 */
			var table;
			if (tinymce.isWebKit && sn === en /* deal with collapsed selections only */
				&& sn.nodeType === 1
				&& sn.childNodes.length > 0
				&& ed.dom.is(table = sn.childNodes[so > 0 ? so - 1 : 0], "table")) {
				/**
				 * default webkit browser behaviour is jittery (possibly because it creates a BR and then transitions to a P)
				 * do our own paragraph insertion
				 */
				var newParagraph = dom.create('p', 0, '<br data-mce-bogus="1" />');
				dom.insertAfter(newParagraph, table);

				r.setStart(newParagraph, 0);
				ed.selection.setRng(r);

				var yPos = ed.dom.getPos(newParagraph).y;
				if (yPos > vp.y) {
					ed.getWin().scrollTo(0, yPos);
				}

				ed.undoManager.add();

				return FALSE;
			}

			// If selection is in empty table cell
			if (sn === en && /^(TD|TH)$/.test(sn.nodeName)) {
				if (sn.firstChild.nodeName == 'BR')
					dom.remove(sn.firstChild); // Remove BR

				// Create two new block elements
				if (sn.childNodes.length == 0) {
					ed.dom.add(sn, se.element, null, '<br />');
					aft = ed.dom.add(sn, se.element, null, '<br />');
				} else {
					n = sn.innerHTML;
					sn.innerHTML = '';
					ed.dom.add(sn, se.element, null, n);
					aft = ed.dom.add(sn, se.element, null, '<br />');
				}

				// Move caret into the last one
				r = d.createRange();
				r.selectNodeContents(aft);
				r.collapse(1);
				ed.selection.setRng(r);

				return FALSE;
			}

			// If the caret is in an invalid location in FF we need to move it into the first block
			if (sn == b && en == b && b.firstChild && ed.dom.isBlock(b.firstChild)) {
				sn = en = sn.firstChild;
				so = eo = 0;
				rb = d.createRange();
				rb.setStart(sn, 0);
				ra = d.createRange();
				ra.setStart(en, 0);
			}

			// If the body is totally empty add a BR element this might happen on webkit
			if (!d.body.hasChildNodes()) {
				d.body.appendChild(dom.create('br'));
			}

			// Never use body as start or end node
			sn = sn.nodeName == "HTML" ? d.body : sn; // Fix for Opera bug: https://bugs.opera.com/show_bug.cgi?id=273224&comments=yes
			sn = sn.nodeName == "BODY" ? sn.firstChild : sn;
			en = en.nodeName == "HTML" ? d.body : en; // Fix for Opera bug: https://bugs.opera.com/show_bug.cgi?id=273224&comments=yes
			en = en.nodeName == "BODY" ? en.firstChild : en;


			// ATLASSIAN Never use the root node as the start or end node, otherwise elements
			// may get inserted outside of the root node. Firefox tends to include the contenteditable
			// element itself in the selection on Ctrl/Cmd+A.
			var root = ed.dom.getRoot();
			if (sn.nodeName == root.nodeName) {
				sn = sn.firstChild;
				so = 0;
			}
			if (en.nodeName == root.nodeName) {
				en = en.firstChild;
				eo = 0;
			}

			// Get start and end blocks
			sb = t.getParentBlock(sn);
			eb = t.getParentBlock(en);
			bn = sb ? sb.nodeName : se.element; // Get block name to create

			// Return inside list use default browser behavior
			if (n = t.dom.getParent(sb, 'li,pre')) {
				if (n.nodeName == 'LI')
					return splitList(ed.selection, t.dom, n);

				return TRUE;
			}

			// If caption or absolute layers then always generate new blocks within
			if (sb && (sb.nodeName == 'CAPTION' || /absolute|relative|fixed/gi.test(dom.getStyle(sb, 'position', 1)))) {
				bn = se.element;
				sb = null;
			}

			// If caption or absolute layers then always generate new blocks within
			if (eb && (eb.nodeName == 'CAPTION' || /absolute|relative|fixed/gi.test(dom.getStyle(sb, 'position', 1)))) {
				bn = se.element;
				eb = null;
			}

			// Use P instead
			if (/(TD|TABLE|TH|CAPTION)/.test(bn) || (sb && bn == "DIV" && /left|right/gi.test(dom.getStyle(sb, 'float', 1)))) {
				bn = se.element;
				sb = eb = null;
			}

			// Setup new before and after blocks
			bef = (sb && sb.nodeName == bn) ? sb.cloneNode(0) : ed.dom.create(bn);
			aft = (eb && eb.nodeName == bn) ? eb.cloneNode(0) : ed.dom.create(bn);

			// Remove id from after clone
			aft.removeAttribute('id');

			// Is header and cursor is at the end, then force paragraph under
			if (/^(H[1-6])$/.test(bn) && isAtEnd(r, sb))
				aft = ed.dom.create(se.element);

			// Find start chop node
			n = sc = sn;
			do {
				if (n == b || n.nodeType == 9 || t.dom.isBlock(n) || /(TD|TABLE|TH|CAPTION)/.test(n.nodeName))
					break;

				sc = n;
			} while ((n = n.previousSibling ? n.previousSibling : n.parentNode));

			// Find end chop node
			n = ec = en;
			do {
				if (n == b || n.nodeType == 9 || t.dom.isBlock(n) || /(TD|TABLE|TH|CAPTION)/.test(n.nodeName))
					break;

				ec = n;
			} while ((n = n.nextSibling ? n.nextSibling : n.parentNode));

			// Place first chop part into before block element
			if (sc.nodeName == bn)
				rb.setStart(sc, 0);
			else
				rb.setStartBefore(sc);

			rb.setEnd(sn, so);
			bef.appendChild(rb.cloneContents() || d.createTextNode('')); // Empty text node needed for Safari

			// Place secnd chop part within new block element
			try {
				ra.setEndAfter(ec);
			} catch(ex) {
				//console.debug(s.focusNode, s.focusOffset);
			}

			ra.setStart(en, eo);
			aft.appendChild(ra.cloneContents() || d.createTextNode('')); // Empty text node needed for Safari

			// Create range around everything
			r = d.createRange();
			if (!sc.previousSibling && sc.parentNode.nodeName == bn) {
				r.setStartBefore(sc.parentNode);
			} else {
				if (rb.startContainer.nodeName == bn && rb.startOffset == 0)
					r.setStartBefore(rb.startContainer);
				else
					r.setStart(rb.startContainer, rb.startOffset);
			}

			if (!ec.nextSibling && ec.parentNode.nodeName == bn)
				r.setEndAfter(ec.parentNode);
			else
				r.setEnd(ra.endContainer, ra.endOffset);

			// Delete and replace it with new block elements
			r.deleteContents();

			if (isOpera)
				ed.getWin().scrollTo(0, vp.y);

			// Never wrap blocks in blocks
			if (bef.firstChild && bef.firstChild.nodeName == bn)
				bef.innerHTML = bef.firstChild.innerHTML;

			if (aft.firstChild && aft.firstChild.nodeName == bn)
				aft.innerHTML = aft.firstChild.innerHTML;

			function appendStyles(e, en) {
				var nl = [], nn, n, i;

				e.innerHTML = '';

				// Make clones of style elements
				if (se.keep_styles) {
					n = en;
					do {
						// We only want style specific elements
						if (/^(SPAN|STRONG|B|EM|I|FONT|STRIKE|U)$/.test(n.nodeName)) {
							nn = n.cloneNode(FALSE);
							dom.setAttrib(nn, 'id', ''); // Remove ID since it needs to be unique
							nl.push(nn);
						}
					} while (n = n.parentNode);
				}

				// Append style elements to aft
				if (nl.length > 0) {
					for (i = nl.length - 1, nn = e; i >= 0; i--)
						nn = nn.appendChild(nl[i]);

					// Padd most inner style element
					nl[0].innerHTML = isOpera ? '\u00a0' : '<br />'; // Extra space for Opera so that the caret can move there
					return nl[0]; // Move caret to most inner element
				} else
					e.innerHTML = isOpera ? '\u00a0' : '<br />'; // Extra space for Opera so that the caret can move there
			};

			// Padd empty blocks
			if (dom.isEmpty(bef))
				appendStyles(bef, sn);

			// Fill empty afterblook with current style
			if (dom.isEmpty(aft))
				car = appendStyles(aft, en);

			// Opera needs this one backwards for older versions
			if (isOpera && parseFloat(opera.version()) < 9.5) {
				r.insertNode(bef);
				r.insertNode(aft);
			} else {
				r.insertNode(aft);
				r.insertNode(bef);
			}

			// Normalize
			aft.normalize();
			bef.normalize();

			// Move cursor and scroll into view
			ed.selection.select(aft, true);
			ed.selection.collapse(true);

			// scrollIntoView seems to scroll the parent window in most browsers now including FF 3.0b4 so it's time to stop using it and do it our selfs
			y = ed.dom.getPos(aft).y;
			//ch = aft.clientHeight;

			// Is element within viewport
			if (y < vp.y || y + 25 > vp.y + vp.h) {
				ed.getWin().scrollTo(0, y < vp.y ? y : y - vp.h + 25); // Needs to be hardcoded to roughly one line of text if a huge text block is broken into two blocks

				/*console.debug(
					'Element: y=' + y + ', h=' + ch + ', ' +
					'Viewport: y=' + vp.y + ", h=" + vp.h + ', bottom=' + (vp.y + vp.h)
				);*/
			}

			ed.undoManager.add();

			return FALSE;
		},

		backspaceDelete : function(e, bs) {
			var t = this, ed = t.editor, b = ed.getBody(), dom = ed.dom, n, se = ed.selection, r = se.getRng(), sc = r.startContainer, n, w, tn, walker;

			/**
			 * ATLASSIAN: Since backspaceDelete() is meant to supplement the default backspace behaviour in firefox, it should
			 * respect when the backspace key event's default action has been prevented - i.e. don't do anything :)
			 */
			var defaultPrevented = e.getPreventDefault ? e.getPreventDefault() : e.defaultPrevented; // e.defaultPrevented is available on firefox 6+
			if (defaultPrevented) {
				return;
			}

			// Delete when caret is behind a element doesn't work correctly on Gecko see #3011651
			if (!bs && r.collapsed && sc.nodeType == 1 && r.startOffset == sc.childNodes.length) {
				walker = new tinymce.dom.TreeWalker(sc.lastChild, sc);

				// Walk the dom backwards until we find a text node
				for (n = sc.lastChild; n; n = walker.prev()) {
					if (n.nodeType == 3) {
						r.setStart(n, n.nodeValue.length);
						r.collapse(true);
						se.setRng(r);
						return;
					}
				}
			}

			// The caret sometimes gets stuck in Gecko if you delete empty paragraphs
			// This workaround removes the element by hand and moves the caret to the previous element
			if (sc && ed.dom.isBlock(sc) && !/^(TD|TH)$/.test(sc.nodeName) && bs) {
				if (sc.childNodes.length == 0 || (sc.childNodes.length == 1 && sc.firstChild.nodeName == 'BR')) {
					// Find previous block element
					n = sc;
					while ((n = n.previousSibling) && !ed.dom.isBlock(n)) ;

					if (n) {
						if (sc != b.firstChild) {
							// Find last text node
							w = ed.dom.doc.createTreeWalker(n, NodeFilter.SHOW_TEXT, null, FALSE);
							while (tn = w.nextNode())
								n = tn;

							// Place caret at the end of last text node
							r = ed.getDoc().createRange();
							r.setStart(n, n.nodeValue ? n.nodeValue.length : 0);
							r.setEnd(n, n.nodeValue ? n.nodeValue.length : 0);
							se.setRng(r);

							// Remove the target container
							ed.dom.remove(sc);
						}

						return Event.cancel(e);
					}
				}
			}

			// ATLASSIAN - CONFDEV-5383 Gecko doesn't delete the paragraph properly and leaves the br behind
			// This workaround explicitly removes the whole element and moves cursor to the next text node.
			if (!bs && r.collapsed && /^(BODY)$/.test(sc.nodeName)) {
				var selected = sc.childNodes[r.startOffset];
				if (selected && ed.dom.isBlock(selected) && !/^(TD|TH)$/.test(selected.nodeName)) {
					if (selected.childNodes.length == 0 || (selected.childNodes.length == 1 && selected.firstChild.nodeName == 'BR')) {
						n = selected;
						var next;
						while ((n = n.nextSibling)) {
							if (ed.dom.isBlock(n)) {
								next = n;
								break;
							}
						}

						if (next) {
							if (selected != b.lastChild) {
								// Find first text node
								w = ed.dom.doc.createTreeWalker(next, NodeFilter.SHOW_TEXT, null, FALSE);
								next = w.nextNode();

								// Place caret at the start of first text node
								r = ed.getDoc().createRange();
								r.setStart(next, 0);
								r.setEnd(next, 0);
								se.setRng(r);

								// Remove the target container
								ed.dom.remove(selected);

								return Event.cancel(e);
							}
						}
					}
				}
			}
		}
	});
})(tinymce);
