(function($) {
	var doLog = false;

    $.fn.mySelectDropdown = function(options) {
        return this.each(function() {
            var $this = $(this);

            $this.each(function() {
                var dropdown = $("<div />").addClass("selectDropdown selectDropdown");

                if ($(this).is(":disabled")) dropdown.addClass("disabled");

                $(this).wrap(dropdown);

                var label = $('<span tabindex="0" />').append($('<span />').text($(this).attr("placeholder"))).insertAfter($(this));
                var list = $("<ul />");

                $(this).find("option").each(function() {
                    var image = $(this).data("image");
                    if (image) {
                        list.append(
                            $("<li />").append(
                                $('<a />')
                                .attr("data-val", $(this).val())
                                .html($('<span />').append($(this).text()))
                                .prepend('<img src="' + image + '" >')
                            )
                        );
                    } else if ($(this).val() != "") {
                        list.append(
                            $("<li />").append(
                                $("<a />")
                                .attr("data-val", $(this).val())
                                .html($("<span />").append($(this).text()))
                            )
                        );
                    }
                });

                list.insertAfter($(this));

                if ($(this).find("option:selected").length > 0 && $(this).find("option:selected").val() != "") {
                    list.find('li a[data-val="' + $(this).find("option:selected").val() + '"]').parent().addClass("active");
                    $(this).parent().addClass("filled");
                    label.html(list.find("li.active a").html());
                }
            });

            if (!$(this).is(":disabled")) {
                $(this).parent().on("click", "ul li a", function(e) {
                    e.preventDefault();
                    var dropdown = $(this).parent().parent().parent();
                    var active = $(this).parent().hasClass("active");
                    var label = active ? $("<span />").text(dropdown.find("select").attr("placeholder")) : $(this).html();
                    dropdown.find("option").prop("selected", false);
                    dropdown.find("ul li").removeClass("active");
                    dropdown.toggleClass("filled", !active);
                    dropdown.children("span").html(label);
                    if (!active) {
                        dropdown
                            .find('option[value="' + $(this).attr("data-val") + '"]')
                            .prop("selected", true);
                        $(this).parent().addClass("active");
                    }
                    dropdown.removeClass("open");
                    dropdown.find('> span').focus(); //RWC added
                });

                $this.parent().on("click", "> span", function(e) {
                    var self = $(this).parent();
                    self.toggleClass("open");
                    self.focus();
                });

                $(document).on("click touchstart", function(e) {
                    var dropdown = $this.parent();
                    if (dropdown !== e.target && !dropdown.has(e.target).length) {
                        dropdown.removeClass("open");
                    }
                });

                $(document).on("keydown", function(e) {
                    onKeyDown(e);
                });
            }
        });
    };

    function onKeyDown(e) {
		var $span = $('.selectDropdown > span');
		var focused = $span.is(":focus");
		consoleLog('focused = ' + focused);
		var $dropdownDiv = focused ? $span.closest(".selectDropdown") : false; //getDropdownDivBasedOnMousePosition();

		if($dropdownDiv === false)
		{
			consoleLog('no valid $dropdownDiv');
			return;
		}

		consoleLog($dropdownDiv);
		var $foundLink = $dropdownDiv.find("li.active a");

		if(e.key == 'Tab')
		{
			$dropdownDiv.removeClass("open");
			return;
		}
		else
		{
			 e.preventDefault();
		}

        switch (e.key) {
            case 'Escape': {
                $dropdownDiv.removeClass("open");
                $span.focus();
                return;
            }
            case 'Enter': {
				if(focused) {
					$dropdownDiv.toggleClass("open");
				}
                return;
            }
            case 'ArrowUp':
            case 'ArrowDown':
            case 'Home':
            case 'End':
            case 'PageUp':
            case 'PageDown': {
                moveActive($dropdownDiv, e.key);
                return;
            }

            default: {
                var searchStr = String.fromCharCode(e.which);
                searchStr = regExpEscape(searchStr.toLowerCase());
                var $foundLinks = $dropdownDiv.find("li a").filter(function() {
                    return $(this)
                        .text()[0]
                        .toLowerCase()
                        .match(searchStr);
                });
                switch ($foundLinks.length) {
                    case 0: {
                        return;
                    }
                    case 1: {
                        $span = $dropdownDiv.find("> span");
                        $foundLink = $($foundLinks);
                        break;
                    }
                    default: {
                        $span = $dropdownDiv.find("> span");
                        var index = getIndexOfSearchStr($span.html(), $foundLinks) + 1;
                        $foundLink = $($foundLinks[index % $foundLinks.length]);
                    }
                }
				$dropdownDiv.addClass("filled");
				$dropdownDiv.find("li.active").removeClass("active");
                $foundLink.parent().addClass("active");
                setSelectValue($dropdownDiv, $foundLink, $span);
                scrollIfRequired($foundLink.parent(), $dropdownDiv.find("ul"));
            }
        }

        function getDropdownDivBasedOnMousePosition() {
            var $hoverElm = $(':hover');
            var $dropdownDiv = $hoverElm.closest(".selectDropdown");
            if ($dropdownDiv.length > 0) {
                return $dropdownDiv;
            }
            $dropdownDiv = $hoverElm.children(".selectDropdown");
            if ($dropdownDiv.length > 0) {
                return $dropdownDiv;
            }
            return false;
        }

        function setSelectValue($dropdownDiv, $foundLink, $span)
        {
			$dropdown = $dropdownDiv.find('select.selectDropdown');
			if ($foundLink && ($span.html() != $foundLink.html())) {
				$span.html($foundLink.html());
				$dropdown.val($foundLink.data('val'));
				consoleLog('Active value = ' + $dropdown.val());
			}
		}

		function consoleLog(text)
		{
			if(doLog)
			{
				console.log(text);
			}
		}

        function getIndexOfSearchStr($searchStr, $array) {
            for (var i = 0; i < $array.length; i++) {
                if ($($array[i]).html() == $searchStr) {
                    return i;
                }
            }
            return -1;
        }

        function moveActive($dropdownDiv, key) {
            var $list = $dropdownDiv.find('ul');
            var $listItems = $list.find('li');
            var $active = $list.find('.active');
            var $foundLink = $active.find('a');
            var activeIndex = $listItems.index($active);
            var lastIndex = $listItems.length - 1;
            $active.removeClass('active');
            var target;
            switch (key) {
                case 'ArrowUp':
                    target = Math.max(0, activeIndex - 1);
                    break;
                case 'ArrowDown':
                    target = Math.min(lastIndex, activeIndex + 1);
                    break;
                case 'Home':
                    target = 0;
                    break;
                case 'End':
                    target = lastIndex;
                    break;
                case 'PageUp':
                    target = Math.max(0, activeIndex - 20);
                    break;
                case 'PageDown':
                    target = Math.min(lastIndex, activeIndex + 20);
                    break;
            }
            $active = $list.find('li:eq(' + target + ')');
            $active.addClass('active');
            $foundLink = $active.find("a");
            if($dropdownDiv.hasClass("open"))
            {
            	scrollIfRequired($active, $list);
			}
            setSelectValue($dropdownDiv, $foundLink, $span);
        }

        function scrollIfRequired($child, $parent) {
            if ($child.length < 1) {
                return;
            }
            var $rectElm = $child[0].getBoundingClientRect();
            var $rectContainer = $parent[0].getBoundingClientRect();
            if ($rectElm.bottom > $rectContainer.bottom) {
                $child[0].scrollIntoView(false);
            }
            if ($rectElm.top < $rectContainer.top) {
                $child[0].scrollIntoView();
            }
        }

        function regExpEscape(value) {
            return value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
        }
    }
})(jQuery);

$("select.selectDropdown").mySelectDropdown();