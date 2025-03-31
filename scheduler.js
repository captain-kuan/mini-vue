let activeEffect;

const bucket = new WeakMap();
function reactive(obj) {
  return new Proxy(obj, {
    get(target, key) {
      track(target, key);
      return Reflect.get(target, key);
    },
    set(target, key, val) {
      Reflect.set(target, key, val);
      trigger(target, key);
    },
  });
}

function track(target, key) {
  if (activeEffect) {
    let depsMap = bucket.get(target);
    if (!depsMap) {
      bucket.set(target, (depsMap = new Map()));
    }
    let deps = depsMap.get(key);
    if (!deps) {
      depsMap.set(key, (deps = new Set()));
    }
    activeEffect.deps.push(deps);
    deps.add(activeEffect);
  }
}
function trigger(target, key) {
  const deps = bucket.get(target)?.get(key);
  if (!deps) return;
  // 重新构建一个set,否则 重新触发track会无线循环
  const effectToRun = new Set();

  for (const dep of deps) {
    if (dep !== activeEffect) {
      effectToRun.add(dep);
    }
  }
  if (effectToRun) {
    effectToRun.forEach((fn) => {
      fn();
    });
  }
}
function cleanupEffect(effectFn) {
  // 每次执行后需清空之前的收集
  effectFn.deps.forEach((deps) => deps.delete(effectFn));
}
const effectStack = [];
function effect(fn, options) {
  const effectFn = () => {
    effectFn.options = options;
    cleanupEffect(effectFn);
    effectStack.push(effectFn);
    activeEffect = effectFn;
    if (options.scheduler) {
      options.scheduler(fn);
    } else {
      fn();
    }
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
  };
  effectFn.deps = [];
  effectFn();
}
const jobQueue = new Set();
const p = Promise.resolve();
let isFlushing = false;
function flushJob() {
  if (isFlushing) return;
  isFlushing = true;
  p.then(() => {
    jobQueue.forEach((fn) => fn());
  }).finally(() => {
    isFlushing = false;
  });
}
const vm = reactive({
  name: "node",
  msg: "failed",
  num: 0,
  ok: true,
});

effect(
  () => {
    console.log(vm.num);
  },
  {
    scheduler(fn) {
      jobQueue.add(fn);
      flushJob();
    },
  }
);
vm.num++;
vm.num++;
