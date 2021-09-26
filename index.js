/**
 * 数据双向绑定：
 * 1.  数据  ---->  视图 （根据数据渲染视图）
 * 2.  视图  ---->  数据 （视图改变数据也随之改变）
 */

// Vue
function Vue(options) {
    // 将data和$el挂载到Vue实例上
    this.data = options.data;
    this.el = options.el;
    this.methods = options.methods;
    // 绑定data属性代理
    Object.keys(this.data).forEach((key) => {
        this.proxyData(key);
    });
    addObserve(this.data);
    new Compiler(this.el, this);
    options.mounted.call(this); // 所有事情处理好后执行mounted函数
    return this;
}

/**
 * 代理this.data.book属性到this.book可以直接访问
 */
Vue.prototype = {
    proxyData(key) {
        Object.defineProperty(this, key, {
            enumerable: false,
            configurable: true,
            get() {
                return this.data[key];
            },
            set(newVal) {
                this.data[key] = newVal;
            }
        })
    }
};

/**
 * 监听器Observer
 * 给data的每个key添加监听
 */
let addObserve = (data) => {
    if (!data || Object.prototype.toString.call(data).toLocaleLowerCase() !== '[object object]') {
        return;
    }

    Object.keys(data).forEach((key) => {
        observe(data, key, data[key]);
    });
};

let observe = (obj, key, val) => {
    addObserve(val); // 子属性如果是对象，则也需要添加监听
    let dep = new Dep();
    Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        set(setVal) {
            if (setVal === val) {
                return;
            }
            val = setVal;
            dep.notify();
        },
        get() {
            if (Dep.target) {
                dep.addWatcher(Dep.target);
            }
            return val;
        }
    })
};

/**
 * Dep可以存放订阅者的消息订阅器
 * 根据Observe中监听到的数据变化，来触发相应函数，更新视图
 */
function Dep() {
    this.watchers = [];
}

Dep.prototype = {
    // 添加
    addWatcher(watcher) {
        this.watchers.push(watcher);
    },

    // 触发
    notify() {
        this.watchers.forEach((watcher) => {
            // 触发视图更新
            watcher.update();
        })
    }
};
Dep.target = null;

/**
 * 订阅者Watcher
 * 根据Observe中监听到的数据变化，来触发相应函数，更新视图
 */

function Watcher(data, exp, callback) {
    this.data = data;
    this.exp = exp;
    this.value = this.get();
    this.callback = callback;
}

Watcher.prototype = {
    update() {
        let oldValue = this.value;
        let newValue = this.data[this.exp];
        if (newValue !== oldValue) {
            this.value = newValue;
            this.callback(newValue);
        }
    },

    /**
     * 触发已注册的监听器，并在Observe的getter中触发Dep存储订阅者
     */
    get() {
        Dep.target = this; // 将监听者this对象挂到Dep.target上，方便后续将watcher存储到Dep（订阅器）中
        let value = this.data[this.exp];
        Dep.target = null; // 存储到Dep中后，清空Dep.target
        return value;
    }
};

/**
 * 解析器Compile
 * 解析每个dom节点上的相关指令
 */
function Compiler(el, vm) {
    let $el = document.querySelector(el);
    compilerSpecificVariable($el);

    /**
     * 解析特定标识（双大括号）里的变量：{{变量}}
     */
    function compilerSpecificVariable($el) {
        let childrenNodes = $el.children;
        let reg = /\{\{(.*)\}\}/;
        Array.prototype.forEach.call(childrenNodes, node => {
            let text = node.innerText;
            // 文本节点的nodeType === 3
            if (reg.test(text)) {
                compileText(node, text, reg.exec(text)[1]);
            }

            let nodeName = node.nodeName;
            let attrs = node.attributes;
            Array.prototype.forEach.call(attrs, (attr) => {
                if (attr.name === 'v-model') {
                    if (nodeName === 'INPUT') {
                        vueInput(node, attr.value, vm);
                    }
                    node.innerText = vm.data[attr.value] || ''
                } else if (attr.name.indexOf('v-on') > -1) {
                    let eventType = attr.name.split(':')[1].replace(' ', '');
                    let methodName = attr.value;
                    compileEvent(node, eventType, methodName, vm)
                }
            });
        });
    }

    function compileText(node, text, exp) {
        updateNodeText(node, text, vm.data[exp]); // 初始化data数据到视图
        new Watcher(vm.data, exp, (value) => {
            updateNodeText(node, text, value)
        });
    }

    function updateNodeText(node, text, value) {
        let reg = /\{\{(.*)\}\}/;
        value = value || '';
        node.innerText = text.replace(/\{\{(.*)\}\}/, value);
    }

    /**
     * 指令事件
     */
    function compileEvent(node, type, methodName, vm) {
        if (type === 'click') {
            node.addEventListener('click', () => {
                vm.methods[methodName].call(vm);
            }, false);
        }
    }

    // /**
    //  * 解析指令
    //  * 如；v-on: click;  v-model
    //  */
    // function compilerDirective($el) {
    //     let childrenNodes = $el.childNodes;
    //
    // }


    /**
     * 给input绑定事件
     *
     * @param node input
     * @param exp input绑定的data中的key
     * @param vm Vue的this
     */
    function vueInput(node, exp, vm) {
        node.addEventListener('keyup', () => {
            vm.data[exp] = node.value;
        }, false);
    }
}
