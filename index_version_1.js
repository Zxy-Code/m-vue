/**
 * 数据双向绑定：
 * 1.  数据  ---->  视图 （根据数据渲染视图）
 * 2.  视图  ---->  数据 （视图改变数据也随之改变）
 *
 * let $bookEl = document.querySelector('#book');
 * let vue = new Vue({
 *        book: '水浒传',
 *    }, $bookEl, 'book');
 *
 * // 模拟修改book的值
 * setTimeout(() => {
 *     console.log(vue);
 *     vue.data.book = '红楼梦';
 * }, 2000);
 */

// Vue
function Vue(data, $el, exp) {
    // 将data和$el挂载到Vue实例上
    this.data = data;
    this.$el = $el;
    addObserve(data);

    // 初始化视图数据： 数据 -->  视图
    $el.innerHTML = data[exp];

    // 注册监听者，来处理数据变化后的视图更新
    new Watcher(data, exp, (value) => {
        console.log('这是一个set后的输出');
        $el.innerHTML = value
    });

    return this;
}


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
