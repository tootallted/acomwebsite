document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.voice-carousel').forEach(function (carousel) {
    var slides = Array.prototype.slice.call(carousel.querySelectorAll('.voice-slide'));
    if (slides.length <= 1) return;

    var card = carousel.closest('.voices-card');
    var controls = card ? card.querySelector('.voice-controls') : null;
    var dotsWrap = controls ? controls.querySelector('.voice-dots') : null;
    var current = 0;
    var timer;

    function show(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        slide.classList.toggle('is-active', i === current);
      });
      if (dotsWrap) {
        Array.prototype.forEach.call(dotsWrap.children, function (dot, i) {
          dot.classList.toggle('is-active', i === current);
        });
      }
    }

    function restart() {
      clearInterval(timer);
      timer = setInterval(function () { show(current + 1); }, 7000);
    }

    if (dotsWrap) {
      slides.forEach(function (_, i) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        dot.addEventListener('click', function () { show(i); restart(); });
        dotsWrap.appendChild(dot);
      });
    }

    if (controls) {
      Array.prototype.forEach.call(controls.querySelectorAll('.voice-btn'), function (btn) {
        btn.addEventListener('click', function () {
          show(current + parseInt(btn.getAttribute('data-dir'), 10));
          restart();
        });
      });
    }

    carousel.addEventListener('mouseenter', function () { clearInterval(timer); });
    carousel.addEventListener('mouseleave', restart);

    show(0);
    restart();
  });
});
