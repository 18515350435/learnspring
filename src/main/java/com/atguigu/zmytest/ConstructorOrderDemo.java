package com.atguigu.zmytest;

/**
 * 构造顺序演示入口：运行后依次输出 People build、Boy build。
 * <p>说明创建子类实例时，会先调用父类构造器。</p>
 */
public class ConstructorOrderDemo {
    public static void main(String[] args) {
        new Boy();
    }
}
