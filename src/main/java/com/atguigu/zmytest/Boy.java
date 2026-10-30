package com.atguigu.zmytest;

/**
 * 子类：继承 People，观察父类构造先于子类构造执行。
 */
public class Boy extends People {
    public Boy() {
        System.out.println("boy build");
    }
}
