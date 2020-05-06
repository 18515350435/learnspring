package com.atguigu.aop;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;

public class MyTestBeanfactoryPostProcess implements BeanFactoryPostProcessor {
	
	@Override
	public void postProcessBeanFactory(ConfigurableListableBeanFactory configurableListableBeanFactory) throws BeansException {
		System.out.println("I am MyTestBeanfactoryPostProcess!");
	}
}
