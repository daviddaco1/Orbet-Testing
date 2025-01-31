/*$(document).ready(function(){
	$('#testomonialsSlider').owlCarousel({
		//margin:30,
		loop:false,
		items:2,
		dots:false,
		nav:true,
        responsive:{
        0:{items:1,margin:10,},
        767:{margin:15},
        1023:{margin:30}
		}
	});
});*/


$('.layoutBox').scroll(function() {
if ($(this).scrollTop() > 1){  
    $('header').addClass("sticky");
  }
  else{
    $('header').removeClass("sticky");
  }
});


$(document).ready(function(){
	
	$('.popupBoxClose').on('click', function(){
    	$('.popupopOverlayBox').removeClass('active');
		$(this).siblings().removeClass('active');
	});
	
	
	$('#loginPopupBtn').on('click', function(){
    	$('.loginPopupBox').addClass('active');
    	$('.registerPopupBox,.termsConditionsPopupBox').removeClass('active');
	});
	
	$('#registerPopupBtn').on('click', function(){
    	$('.loginPopupBox').removeClass('active');
    	$('.registerPopupBox').addClass('active');
	});
	
	$('#continueBtn').on('click', function(){
    	$('.loginPopupBox,.registerPopupBox').removeClass('active');
    	$('.termsConditionsPopupBox').addClass('active');
	});
	
		
	$('#tandcCheckbox').change(function(){
		if($(this).is(":checked")) {
			$('.tandcBtn').addClass("active");
		} else {
			$('.tandcBtn').removeClass("active");
		}
	});
	
});