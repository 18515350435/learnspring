package com.atguigu.aop;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.beans.factory.support.BeanDefinitionRegistryPostProcessor;

public class MyTestBeanDefinitionRegistryPostProcessor implements BeanDefinitionRegistryPostProcessor {
	

	@Override
	public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry beanDefinitionRegistry) throws BeansException {
		System.out.println("I am MyTestBeanDefinitionRegistryPostProcessor!-postProcessBeanDefinitionRegistry");

	}

	@Override
	public void postProcessBeanFactory(ConfigurableListableBeanFactory configurableListableBeanFactory) throws BeansException {
		System.out.println("I am MyTestBeanDefinitionRegistryPostProcessor!-postProcessBeanFactory");

	}
}
