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
  // 重新构建一个set,否则 重新触发track会无线循环
  const effectToRun = new Set(deps);
  if (effectToRun) {
    effectToRun.forEach((fn) => {
      fn();
    });
  }
}
function effect(fn) {
  const effectFn = () => {
    cleanupEffect(effectFn);
    activeEffect = effectFn;
    fn();
  };
  effectFn.deps = [];
  effectFn();
}
function cleanupEffect(effectFn) {
  // 每次执行后需清空之前的收集
  effectFn.deps.forEach((deps) => deps.delete(effectFn));
}

const vm = reactive({
  name: "node",
  msg: "failed",
  ok: true,
});

effect(() => {
  console.log(vm.ok ? vm.name : vm.msg);
});
vm.ok = false;

vm.name = "nodejs";
