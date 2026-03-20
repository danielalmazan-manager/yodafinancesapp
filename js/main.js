/* ============================================
   YODA — NexusLogic IT
   Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---- Mobile nav toggle ---- */
    const navToggle = document.getElementById('navToggle');
    const navMenu   = document.getElementById('navMenu');

    navToggle?.addEventListener('click', () => {
        navToggle.classList.toggle('open');
        navMenu.classList.toggle('open');
    });

    // Close on link click
    navMenu?.querySelectorAll('.nav__link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('open');
            navMenu.classList.remove('open');
        });
    });

    /* ---- Header scroll effect ---- */
    const header = document.getElementById('header');
    const onScroll = () => {
        header?.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ---- Active nav link on scroll ---- */
    const sections  = document.querySelectorAll('section[id]');
    const navLinks  = document.querySelectorAll('.nav__link');

    const observerOptions = {
        root: null,
        rootMargin: '-40% 0px -55% 0px',
        threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(link => {
                    link.classList.toggle(
                        'active',
                        link.getAttribute('href') === `#${entry.target.id}`
                    );
                });
            }
        });
    }, observerOptions);

    sections.forEach(sec => sectionObserver.observe(sec));

    /* ---- Feature cards — entrance animation ---- */
    const cards = document.querySelectorAll('.feature-card');
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity    = '1';
                    entry.target.style.transform  = 'translateY(0)';
                }, i * 80);
                cardObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    cards.forEach(card => {
        card.style.opacity   = '0';
        card.style.transform = 'translateY(24px)';
        card.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
        cardObserver.observe(card);
    });

    /* ---- About stats counter ---- */
    const statValues = document.querySelectorAll('.stat__value');
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statValues.forEach(el => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.6s ease';
        statsObserver.observe(el);
    });

    /* ---- Contact form ---- */
    const form     = document.getElementById('contactForm');
    const feedback = document.getElementById('formFeedback');
    const submitBtn = document.getElementById('contactSubmit');

    form?.addEventListener('submit', (e) => {
        e.preventDefault();

        const name    = document.getElementById('contactName').value.trim();
        const email   = document.getElementById('contactEmail').value.trim();
        const message = document.getElementById('contactMessage').value.trim();

        // Basic validation
        if (!name || !email || !message) {
            setFeedback('Por favor completa todos los campos.', true);
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setFeedback('Ingresa un correo electrónico válido.', true);
            return;
        }

        // Simulate submission
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando…';

        setTimeout(() => {
            setFeedback('✅ ¡Mensaje enviado! Nos pondremos en contacto pronto.', false);
            form.reset();
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar mensaje';
        }, 1500);
    });

    function setFeedback(msg, isError) {
        feedback.textContent = msg;
        feedback.className = `form__feedback${isError ? ' error' : ''}`;
        setTimeout(() => { feedback.textContent = ''; }, 5000);
    }

    /* ---- Smooth scroll for anchor links ---- */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const offset = 80; // header height
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

});
