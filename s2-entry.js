(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.S2Entry = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    const STAGGER_MS = 70;
    const INITIAL_DELAY_MS = 180;
    const OUTWARD_SPEED = 11;

    function createEntryPlan({ season, nodeType, index = 0, total = 1, initial = false, reducedMotion = false }) {
        if (season !== 's2' || nodeType !== 'member' || reducedMotion) {
            return { travel: false, delay: 0, vx: 0, vy: 0 };
        }
        const count = Number.isFinite(total) ? Math.max(1, Math.floor(total)) : 1;
        const safeIndex = Number.isFinite(index)
            ? Math.min(count - 1, Math.max(0, Math.floor(index)))
            : 0;
        const angle = -Math.PI / 2 + (safeIndex / count) * Math.PI * 2;
        return {
            travel: true,
            delay: initial ? INITIAL_DELAY_MS + safeIndex * STAGGER_MS : 0,
            vx: Number((Math.cos(angle) * OUTWARD_SPEED).toFixed(4)),
            vy: Number((Math.sin(angle) * OUTWARD_SPEED).toFixed(4))
        };
    }

    function createGenerationGuard() {
        let generation = 0;
        return {
            begin() { generation += 1; return generation; },
            invalidate() { generation += 1; },
            isCurrent(token) { return token === generation; }
        };
    }

    function createTimerRegistry({ setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
        const handles = new Set();
        return {
            schedule(callback, delay) {
                let handle;
                handle = setTimer(() => {
                    handles.delete(handle);
                    callback();
                }, delay);
                handles.add(handle);
                return handle;
            },
            clear() {
                handles.forEach(handle => clearTimer(handle));
                handles.clear();
            },
            get size() { return handles.size; }
        };
    }

    function getTargetId(target) {
        return typeof target === 'object' ? target.id : target;
    }

    return {
        createEntryPlan, createGenerationGuard, createTimerRegistry, getTargetId,
        STAGGER_MS, INITIAL_DELAY_MS, OUTWARD_SPEED
    };
});
