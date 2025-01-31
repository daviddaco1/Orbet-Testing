  
  $(document).ready(function(){
	  
	/*load Partial Function Start */
	$(".loadPartial").each(function(){
		const pageLoad = $(this).data("page");
		$(this).load(pageLoad, function(data) {
			$(this).replaceWith(data);                
		});
	})
	/*load Partial Function Start */

	/*header scroll function start*/	
	$(window).scroll(function(){
	  var sticky = $('header'),
		  scroll = $(window).scrollTop();
	  if (scroll >= 10) sticky.addClass('sticky');
	  else sticky.removeClass('sticky');
	});
	/*header scroll function end*/
      
    /*header on click function start*/
	  
    $(document).on("click", "#rewards", function (event) {
      event.stopPropagation();
      $(".rewardsWidget").toggleClass("active");
      $(".chatBotWidget,.userContextWidget,.betslipWidget").removeClass("active");
  
      $(document).on("click", function (event) {
        var $trigger = $(".rewardsWidget");
        if (
          $trigger !== event.target &&
          !$trigger.has(event.target).length
        ) {
          $(".rewardsWidget").removeClass("active");
        }
      });
    });
    $(document).on("click", "#chatBot", function (event) {
      event.stopPropagation();
      $(".chatBotWidget").toggleClass("active");
      $(".rewardsWidget,.userContextWidget,.betslipWidget").removeClass("active");
  
      $(document).on("click", function (event) {
        var $trigger = $(".chatBotWidget");
        if (
          $trigger !== event.target &&
          !$trigger.has(event.target).length
        ) {
          $(".chatBotWidget").removeClass("active");
        }
      });
    });
    $(document).on("click", "#userContext", function (event) {
      event.stopPropagation();
	  $(".userContextWidget").toggleClass("active");
      $(".rewardsWidget,.chatBotWidget,.betslipWidget").removeClass("active");
  
      $(document).on("click", function (event) {
        var $trigger = $(".userContextWidget");
        if (
          $trigger !== event.target &&
          !$trigger.has(event.target).length
        ) {
          $(".userContextWidget").removeClass("active");
        }
      });
    });
    $(document).on("click", "#betslip", function (event) {
      event.stopPropagation();
		$(".betslipWidget").toggleClass("active")
      $(".rewardsWidget,.chatBotWidget,.userContextWidget").removeClass("active");
  
   $(document).on("click", function (event) {
        var $trigger = $(".betslipWidget");
        if (
          $trigger !== event.target &&
          !$trigger.has(event.target).length
        ) {
          $(".betslipWidget").removeClass("active");
        }
      });
    });
  
    $(document).on("click", ".betListNameBtn", function(event) {
      event.stopPropagation()
      $(this).parents(".betList").fadeToggle();
    })
  
    $(document).on("click", ".betTitleBtn", function(event) {
      event.stopPropagation()
      $(this).find("em").toggleClass("in")
      $(this).parents(".betTypeList").find(".betListWrapper").slideToggle();
    })
	  
	  
	$(document).on("click", "#liveSupportBtn", function(event) {
      event.stopPropagation()
      $(".supportChatBotWidget").addClass("active");
	  $(".rewardsWidget,.chatBotWidget,.userContextWidget").removeClass("active");
	  
    })
	  
	$(document).on("click", ".supportChatBox .supportChatBoxClose", function(event) {
      event.stopPropagation()
      $(".supportChatBotWidget").removeClass("active");
    })
  
    /*header function end*/
  
	/*Model Popup Open and Close Function Start*/ 
	$(document).on("click", ".popup[data-modal-trigger]", function(event) {
		event.stopPropagation();
		const button = event.currentTarget;
		const trigger = button.getAttribute('data-modal-trigger');
		const modal = document.querySelector(`[data-modal=${trigger}]`);
		const allModals = document.querySelectorAll('.modal');
		allModals.forEach(item => item.classList.remove('open'));
		const close = modal.querySelector('.popupBoxClose');
		close.addEventListener('click', () => modal.classList.remove('open'));
		modal.classList.toggle('open');
		modal.addEventListener('click', function(event) {
		  const target = event.target;
		  if(target === modal) {
			modal.classList.remove('open')
		  }
    })
	})
    /*Model Popup Open and Close Function end*/
	  
	  
	 $('.tableBox').scroll(function(event) {
		if ($(this).scrollTop() > 1){  
			$('thead').addClass("sticky");
		  }
		  else{
			$('thead').removeClass("sticky");
		  }
	});	 
	  
	  
	  
	 $('#tandcCheckbox').change(function(){
      if($(this).is(":checked")) {
        $('.tandcBtn').addClass("active");
      } else {
        $('.tandcBtn').removeClass("active");
      }
    });  
  
    
  });

/*Bottom tab Function Start*/ 
	$(document).ready(function($) {
		// Starting condition when page loads
		$('.tabContent section').hide();
		$('.tabContent section:first').show();
		$('.tabContent section:first').addClass('active');
		$('.tab ul li:first').addClass('active');

		// condition for tab click
		$('.tab ul li').on('click', function(event){
		  event.preventDefault();
		  $('.tab ul li').removeClass('active');
		  $(this).addClass('active');
		  $('.tabContent section').hide();
		  $('.tabContent section').removeClass('active');
		  $($(this).attr('data-tab')).addClass('active');
		  $($(this).attr('data-tab')).fadeIn();
		});
	});	

/*Bottom tab Function End*/ 

