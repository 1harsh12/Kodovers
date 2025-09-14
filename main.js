import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/** Utility to throttle a function */
function throttle(func, limit) {
  let inThrottle;
  return function () {
    const context = this,
      args = arguments;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/** Handles the refined, minimalist cursor */
class Cursor {
  constructor() {
    this.dot = document.querySelector(".cursor-dot");
    if (!this.dot) return;
    this.dot.style.opacity = 1;
    this.posX = 0;
    this.posY = 0;
    gsap.ticker.add(() => {
      gsap.to(this.dot, {
        duration: 0.6,
        x: this.posX,
        y: this.posY,
        ease: "power3.out",
      });
    });
    this.initListeners();
  }
  updatePosition(e) {
    this.posX = e.clientX;
    this.posY = e.clientY;
  }
  initListeners() {
    document.querySelectorAll("[data-cursor-interactive]").forEach((el) => {
      el.addEventListener("mouseenter", () =>
        this.dot.classList.add("interactive")
      );
      el.addEventListener("mouseleave", () =>
        this.dot.classList.remove("interactive")
      );
    });
  }
}

/** Handles magnetic button effects with refined easing */
class MagneticButton {
  constructor(el) {
    this.el = el;
    this.text = el.querySelector(".magnetic-text");
    this.bounds = this.el.getBoundingClientRect();
    this.el.addEventListener("mousemove", (e) => this.onMouseMove(e));
    this.el.addEventListener("mouseleave", () => this.onMouseLeave());
    window.addEventListener(
      "resize",
      () => (this.bounds = this.el.getBoundingClientRect())
    );
  }
  onMouseMove(e) {
    const x = (e.clientX - this.bounds.left) / this.bounds.width - 0.5;
    const y = (e.clientY - this.bounds.top) / this.bounds.height - 0.5;
    gsap.to(this.el, {
      duration: 0.4,
      x: x * 10,
      y: y * 8,
      ease: "power2.out",
    });
    if (this.text)
      gsap.to(this.text, {
        duration: 0.4,
        x: x * 8,
        y: y * 6,
        ease: "power2.out",
      });
  }
  onMouseLeave() {
    const targets = [this.el];
    if (this.text) targets.push(this.text);
    gsap.to(targets, {
      duration: 0.7,
      x: 0,
      y: 0,
      ease: "elastic.out(1, 0.9)",
    });
  }
}

/** Handles the scrambling text effect on hover */
class ScrambleText {
  constructor(el) {
    this.el = el;
    this.chars = "!<>-_\\/[]{}—=+*^?#________";
    this.originalText = el.textContent;
    this.scrambleInterval = null;
    el.addEventListener("mouseenter", () => this.scramble());
    el.addEventListener("mouseleave", () => this.reset());
  }
  scramble() {
    if (this.scrambleInterval) clearInterval(this.scrambleInterval);
    let i = 0;
    this.scrambleInterval = setInterval(() => {
      this.el.textContent = this.originalText
        .split("")
        .map((char, index) =>
          index < i
            ? this.originalText[index]
            : this.chars[Math.floor(Math.random() * this.chars.length)]
        )
        .join("");
      if (i >= this.originalText.length) {
        clearInterval(this.scrambleInterval);
        this.el.textContent = this.originalText;
      }
      i++;
    }, 30);
  }
  reset() {
    clearInterval(this.scrambleInterval);
    this.el.textContent = this.originalText;
  }
}

/** Main WebGL Scene Class */
class WebGLScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.querySelector("#three-canvas"),
      antialias: true,
      alpha: true,
    });
    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2(-100, -100);
    this.normalizedMouse = new THREE.Vector2(0, 0);
    this.coreGroup = new THREE.Group();
    this.colors = {
      intro: { accent: new THREE.Color(0x03dac6) },
      about: { accent: new THREE.Color(0xffffff) },
      projects: { accent: new THREE.Color(0x03dac6) },
      contact: { accent: new THREE.Color(0x03dac6) },
    };
    this.init();
  }

  init() {
    this._setupRenderer();
    if (!/Mobi|Android/i.test(navigator.userAgent)) {
      this.cursor = new Cursor();
    }
    this._createCore();
    this._createParticles();
    this._setupEventListeners();
    this._setupScrollAnimations();
    this._setupUIElements();
    this.animate();
    this._introAnimation();
  }

  _setupRenderer() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.position.set(0, 0, 6);
  }

  _createCore() {
    const icoGeometry = new THREE.IcosahedronGeometry(1.5, 5);
    this.mainIco = new THREE.Mesh(
      icoGeometry,
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.8,
        roughness: 0.2,
        transparent: true,
        opacity: 0.8,
      })
    );
    this.wireframeIco = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.51, 5),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.15,
      })
    );
    this.innerGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 32, 32),
      new THREE.MeshStandardMaterial({
        color: this.colors.intro.accent,
        emissive: this.colors.intro.accent,
        emissiveIntensity: 1.5,
      })
    );
    const positions = icoGeometry.attributes.position;
    this.dotInstances = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      positions.count
    );
    this.initialDotPositions = Array.from({ length: positions.count }, (_, i) =>
      new THREE.Vector3().fromBufferAttribute(positions, i)
    );
    this.coreGroup.add(
      this.mainIco,
      this.wireframeIco,
      this.innerGlow,
      this.dotInstances
    );
    this.scene.add(this.coreGroup);
  }

  _createParticles() {
    const pCount = 40000;
    const pos = new Float32Array(pCount * 3);
    const rand = new Float32Array(pCount);
    for (let i = 0; i < pCount; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
      rand[i] = Math.random();
    }
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(pos, 3)
    );
    this.particleGeometry.setAttribute(
      "aRandom",
      new THREE.BufferAttribute(rand, 1)
    );
    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `uniform float uPixelRatio; uniform vec2 uMouse; attribute float aRandom; void main() { vec4 modelPosition = modelMatrix * vec4(position, 1.0); modelPosition.xyz += vec3(uMouse.x * 0.5 * aRandom, uMouse.y * 0.5 * aRandom, 0.0); vec4 viewPosition = viewMatrix * modelPosition; gl_Position = projectionMatrix * viewPosition; gl_PointSize = (10.0 * aRandom + 5.0) * uPixelRatio; gl_PointSize *= (1.0 / -viewPosition.z); }`,
      fragmentShader: `void main() { float dist = distance(gl_PointCoord, vec2(0.5)); if (dist > 0.5) discard; float strength = 0.05 / dist - 0.1; gl_FragColor = vec4(0.8, 0.9, 1.0, strength); }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.scene.add(
      new THREE.Points(this.particleGeometry, this.particleMaterial)
    );
  }

  _introAnimation() {
    const loadingScreen = document.getElementById("loading-screen");
    const h1Wrappers = document.querySelectorAll("#intro h1 .char-wrapper");
    gsap.set(".site-header", { y: -100, opacity: 0 });
    gsap.set(this.coreGroup.scale, { x: 0, y: 0, z: 0 });
    const tl = gsap.timeline({ delay: 0.5 });
    tl.to(
      { val: 0 },
      {
        val: 100,
        duration: 1,
        onUpdate: function () {
          document.querySelector(
            ".loading-percent"
          ).textContent = `${Math.floor(this.targets()[0].val)}%`;
        },
      }
    )
      .to(loadingScreen, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => (loadingScreen.style.display = "none"),
      })
      .to(
        this.coreGroup.scale,
        { x: 1, y: 1, z: 1, duration: 2, ease: "expo.out" },
        "-=0.25"
      )
      .to(
        ".site-header",
        { y: 0, opacity: 1, duration: 1.5, ease: "expo.out" },
        "-=1.5"
      )
      .from(
        h1Wrappers,
        {
          y: "110%",
          opacity: 0,
          stagger: 0.1,
          ease: "power3.out",
          duration: 1.5,
        },
        "-=1.2"
      );
  }

  _setupEventListeners() {
    document
      .querySelectorAll(".magnetic-button")
      .forEach((el) => new MagneticButton(el));
    new ScrambleText(document.getElementById("scramble-logo"));
    window.addEventListener(
      "resize",
      throttle(() => this._onWindowResize(), 100)
    );
    window.addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.normalizedMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.normalizedMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      if (this.cursor) this.cursor.updatePosition(e);
    });
  }

  _setupScrollAnimations() {
    gsap.utils.toArray(".reveal-wrapper").forEach((w) => {
      gsap.from(w.querySelector(".reveal-content"), {
        y: 100,
        autoAlpha: 0,
        duration: 1.2,
        ease: "expo.out",
        scrollTrigger: {
          trigger: w,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });
    });
    ScrollTrigger.matchMedia({
      "(prefers-reduced-motion: no-preference)": () => {
        const tl3D = gsap.timeline({
          scrollTrigger: {
            trigger: document.body,
            start: "top top",
            end: "bottom bottom",
            scrub: 1.5,
          },
        });
        tl3D
          .to(this.camera.position, { z: 4.5 }, "intro")
          .to(this.coreGroup.rotation, { y: Math.PI * 0.7 }, "about")
          .to(
            this.innerGlow.material.color,
            { ...this.colors.about.accent },
            "about"
          )
          .to(
            this.innerGlow.material.emissive,
            { ...this.colors.about.accent },
            "about"
          );

        const expansionState = { progress: 0 };
        const dummy = new THREE.Object3D();
        const maxExpansion = 1.5;

        const updateDotPositions = (p) => {
          this.initialDotPositions.forEach((pos, i) => {
            const direction = pos.clone().normalize();
            const newPos = pos
              .clone()
              .add(direction.multiplyScalar(p * maxExpansion));
            dummy.position.copy(newPos);
            dummy.updateMatrix();
            this.dotInstances.setMatrixAt(i, dummy.matrix);
          });
          this.dotInstances.instanceMatrix.needsUpdate = true;
        };

        tl3D
          .to(
            expansionState,
            {
              progress: 1,
              ease: "power2.inOut",
              onUpdate: () => updateDotPositions(expansionState.progress),
            },
            "projects"
          )
          .to(this.coreGroup.scale, { x: 1.3, y: 1.3, z: 1.3 }, "projects")
          .to(
            this.coreGroup.rotation,
            { x: Math.PI * 0.5, y: Math.PI * 1.5 },
            "projects"
          )
          .to(
            this.innerGlow.material.color,
            { ...this.colors.projects.accent },
            "projects"
          )
          .to(
            this.innerGlow.material.emissive,
            { ...this.colors.projects.accent },
            "projects"
          );

        tl3D
          .to(
            expansionState,
            {
              progress: 0,
              ease: "power2.inOut",
              onUpdate: () => updateDotPositions(expansionState.progress),
            },
            "contact"
          )
          .to(this.coreGroup.scale, { x: 1, y: 1, z: 1 }, "contact")
          .to(this.coreGroup.rotation, { x: 0, y: Math.PI * 2.5 }, "contact")
          .to(
            this.innerGlow.material.color,
            { ...this.colors.contact.accent },
            "contact"
          )
          .to(
            this.innerGlow.material.emissive,
            { ...this.colors.contact.accent },
            "contact"
          )
          .to(this.innerGlow.material, { emissiveIntensity: 2 }, "contact")
          .to(this.camera.position, { z: 5.5 }, "contact");
      },
    });
  }

  _setupUIElements() {
    const setupMenu = () => {
      const menuToggle = document.querySelector(".menu-toggle"),
        siteNav = document.querySelector(".site-nav");
      if (!menuToggle || !siteNav) return;
      let isOpen = false;
      const toggleMenu = () => {
        isOpen = !isOpen;
        document.body.classList.toggle("no-scroll", isOpen);
        menuToggle.classList.toggle("active", isOpen);
        siteNav.classList.toggle("active", isOpen);
        menuToggle.setAttribute("aria-expanded", isOpen);
      };
      menuToggle.addEventListener("click", toggleMenu);
      siteNav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          if (isOpen) toggleMenu();
          gsap.to(window, {
            duration: 1.5,
            scrollTo: { y: e.currentTarget.hash, offsetY: 50 },
            ease: "power3.inOut",
          });
        });
      });
    };

    const setupHeaderAnimation = () => {
      ScrollTrigger.create({
        start: "top -100px",
        end: "max",
        onUpdate: (s) => {
          const h = document.querySelector(".site-header");
          if (h)
            s.direction === 1
              ? h.classList.add("scrolled")
              : h.classList.remove("scrolled");
        },
      });
      gsap.to("#scroll-progress-bar", {
        scaleX: 1,
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
        },
      });
    };

    const setupScrollToTop = () => {
      const btn = document.getElementById("scroll-to-top");
      if (!btn) return;
      ScrollTrigger.create({
        start: "500px top",
        end: "bottom bottom",
        toggleClass: { target: btn, className: "visible" },
      });
      btn.addEventListener("click", () =>
        gsap.to(window, { duration: 1.5, scrollTo: 0, ease: "power3.inOut" })
      );
    };

    const setupSound = () => {
      const btn = document.getElementById("sound-toggle"),
        audio = document.getElementById("ambient-sound");
      if (!btn || !audio) return;
      const playAudio = () => {
        audio.volume = 0.2;
        audio.play().catch(() => {});
      };
      window.addEventListener("click", playAudio, { once: true });
      btn.addEventListener("click", () => {
        const isMuted = audio.muted;
        audio.muted = !isMuted;
        btn.classList.toggle("is-muted", !isMuted);
        btn.setAttribute("aria-pressed", isMuted);
      });
    };

    setupMenu();
    setupHeaderAnimation();
    setupScrollToTop();
    setupSound();
  }

  _onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.particleMaterial.uniforms.uPixelRatio.value = Math.min(
      window.devicePixelRatio,
      2
    );
    ScrollTrigger.refresh();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const elapsedTime = this.clock.getElapsedTime();
    this.particleMaterial.uniforms.uTime.value = elapsedTime;
    this.particleMaterial.uniforms.uMouse.value.lerp(
      this.normalizedMouse,
      0.05
    );
    this.coreGroup.rotation.y += 0.0005;
    this.coreGroup.rotation.x += 0.0005;
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
    document.body.classList.add("no-cursor");
  }
  new WebGLScene();
});
