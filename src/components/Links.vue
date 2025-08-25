<template>
  <div v-if="homeSiteLinks.length" class="links">
    <div class="line">
      <Icon size="24" style="transform: translateY(1px)">
        <Apps />
      </Icon>
      <span class="title">产品列表</span>
      <div class="all-button" @click="showAllSites = true" style="transform: translateY(2px)">
        <Icon size="20">
          <EllipsisHorizontal />
        </Icon>
        <span class="text" style="font-size: 16px;">全部</span>
      </div>
    </div>
    <!-- 产品列表 -->
    <Swiper
      v-if="homeSiteLinks.length"
      :modules="[Pagination, Mousewheel]"
      :slides-per-view="1"
      :space-between="40"
      :pagination="{
        el: '.swiper-pagination',
        clickable: true,
        bulletElement: 'div',
      }"
      :mousewheel="true"
    >
      <SwiperSlide v-for="site in siteLinksList" :key="site">
        <el-row class="link-all" :gutter="20">
          <el-col v-for="(item, index) in site" :span="8" :key="item">
            <div
              class="item cards"
              :style="index < 3 ? 'margin-bottom: 20px' : null"
              @click="jumpLink(item)"
            >
              <Icon size="26">
                <component :is="siteIcon[item.icon]" />
              </Icon>
              <span class="name text-hidden">{{ item.name }}</span>
            </div>
          </el-col>
        </el-row>
      </SwiperSlide>
      <div class="swiper-pagination" />
    </Swiper>
    <!-- 全部网站 -->
    <Transition name="fade">
      <div
        v-if="showAllSites"
        class="all-sites"
        @click="showAllSites = false"
      >
        <div class="modal" @click.stop>
          <div class="title">
            <Icon size="24">
              <Apps />
            </Icon>
            <span>产品列表</span>
            <Icon
              class="close"
              size="24"
              @click="showAllSites = false"
            >
              <Close />
            </Icon>
          </div>
          <div class="all-list">
            <div class="tabs">
              <div
                v-for="tab in Object.keys(allSiteLinks)"
                :key="tab"
                :class="{ tab: true, active: activeTab === tab }"
                @click="activeTab = tab"
              >
                {{ tab }}
              </div>
            </div>
            <div class="content">
              <el-row class="link-all" :gutter="20">
                <el-col
                  v-for="item in allSiteLinks[activeTab]"
                  :key="item"
                  :span="8"
                >
                  <div class="item cards" @click="jumpLink(item)">
                    <Icon size="26">
                      <component :is="siteIcon[item.icon]" />
                    </Icon>
                    <span class="name text-hidden">{{ item.name }}</span>
                  </div>
                </el-col>
              </el-row>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { Icon } from "@vicons/utils";
// 可前往 https://www.xicons.org 自行挑选并在此处引入
import {
  Blog,
  CompactDisc,
  Edge,
  Magic,
  Atom,
  Fire,
  Signature,
  LaptopCode,
  Asterisk,
  AddressCardRegular,
} from "@vicons/fa"; // 注意使用正确的类别
import { Close, Apps, EllipsisHorizontal } from "@vicons/ionicons5";
import { mainStore } from "@/store";
import { Swiper, SwiperSlide } from "swiper/vue";
import { Pagination, Mousewheel } from "swiper/modules";
import homeSiteLinksFromFile from "@/assets/siteLinks.json";
import allSiteLinksFromFile from "@/assets/allSiteLinks.json";

const store = mainStore();
const showAllSites = ref(false);
const homeSiteLinks = ref([]);
const allSiteLinks = ref({});
const activeTab = ref("");

// NocoDB 数据处理
onMounted(async () => {
  // API endpoint 现在是我们自己的 serverless function
  const url = "/api/getLinks";

  const fallback = () => {
    homeSiteLinks.value = homeSiteLinksFromFile;
    allSiteLinks.value = allSiteLinksFromFile;
    if (Object.keys(allSiteLinksFromFile).length > 0) {
      activeTab.value = Object.keys(allSiteLinksFromFile)[0];
    }
  };

  try {
    const response = await fetch(url);
    if (!response.ok) {
      // 如果API路由不存在或返回错误（例如，在没有代理的纯静态服务器上），则回退
      if (response.status === 404) {
        console.log("API route not found, likely running in a non-proxied environment. Using local data.");
      } else {
        console.error(`API fetch error! status: ${response.status}, using local data.`);
      }
      fallback();
      return;
    }
    const data = await response.json();
    if (data && data.list) {
      // 筛选首页链接 (is_home 字段必须为 true)
      homeSiteLinks.value = data.list.filter((item) => item.is_home === 'true');

      // 格式化所有链接用于“全部”弹窗
      const formattedLinks = {};
      data.list.forEach((item) => {
        const category = item.category || "其他";
        if (!formattedLinks[category]) {
          formattedLinks[category] = [];
        }
        formattedLinks[category].push({
          name: item.name,
          link: item.link,
          icon: item.icon,
        });
      });
      allSiteLinks.value = formattedLinks;
      if (Object.keys(formattedLinks).length > 0) {
        activeTab.value = Object.keys(formattedLinks)[0];
      }
    } else {
      console.warn(
        "API response format is not as expected, using local fallback."
      );
      fallback();
    }
  } catch (error) {
    console.error("Failed to fetch from API, using local data:", error);
    fallback();
  }
});

// 计算网站链接
const siteLinksList = computed(() => {
  const result = [];
  for (let i = 0; i < homeSiteLinks.value.length; i += 6) {
    const subArr = homeSiteLinks.value.slice(i, i + 6);
    result.push(subArr);
  }
  return result;
});

// 网站链接图标
const siteIcon = {
  Blog,
  Edge,
  CompactDisc,
  Signature,
  Magic,
  Atom,
  Fire,
  LaptopCode,
  Asterisk,
  AddressCardRegular,
};

// 链接跳转
const jumpLink = (data) => {
  if (data.name === "音乐" && store.musicClick) {
    if (typeof $openList === "function") $openList();
  } else {
    window.open(data.link, "_blank");
  }
};
</script>

<style lang="scss" scoped>
.links {
  .line {
    margin: 2rem 0.25rem 1rem;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    animation: fade 0.5s;
    .title {
      margin-left: 8px;
      font-size: 1.15rem;
      text-shadow: 0 0 5px #00000050;
    }
    .all-button {
      margin-left: auto;
      border-radius: 6px;
      background-color: #ffffff20;
      padding: 2px 6px;
      border: 1px solid #ffffff60;
      transition: all 0.3s;
      cursor: pointer;
      display: flex;
      align-items: center;
      .text {
        margin-left: 4px;
      }
      &:hover {
        background-color: #ffffff30;
        border-color: #ffffff80;
      }
      &:active {
        transform: scale(0.95);
      }
    }
  }
  .swiper {
    left: -10px;
    width: calc(100% + 20px);
    padding: 5px 10px 0;
    z-index: 0;
    .swiper-slide {
      height: 100%;
    }
    .swiper-pagination {
      margin-top: 12px;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      :deep(.swiper-pagination-bullet) {
        background-color: #fff;
        width: 20px;
        height: 4px;
        margin: 0 4px;
        border-radius: 4px;
        opacity: 0.2;
        transition: opacity 0.3s;
        &.swiper-pagination-bullet-active {
          opacity: 1;
        }
        &:hover {
          opacity: 1;
        }
      }
    }
  }
  .link-all {
    height: 220px;
    .item {
      height: 100px;
      width: 100%;
      display: flex;
      align-items: center;
      flex-direction: row;
      justify-content: center;
      padding: 0 10px;
      animation: fade 0.5s;

      &:hover {
        transform: scale(1.02);
        background: rgb(0 0 0 / 40%);
        transition: 0.3s;
      }

      &:active {
        transform: scale(1);
      }

      .name {
        font-size: 1.1rem;
        margin-left: 8px;
      }
      @media (min-width: 720px) and (max-width: 820px) {
        .name {
          display: none;
        }
      }
      @media (max-width: 720px) {
        height: 80px;
      }
      @media (max-width: 460px) {
        flex-direction: column;
        .name {
          font-size: 1rem;
          margin-left: 0;
          margin-top: 8px;
        }
      }
    }
    @media (max-width: 720px) {
      height: 180px;
    }
  }
  .all-sites {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #00000080;
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
    z-index: 2;
    display: flex;
    justify-content: center;
    align-items: center;
    .modal {
      width: 80%;
      height: 80%;
      background-color: #ffffff10;
      border: 1px solid #ffffff30;
      border-radius: 12px;
      box-shadow: 0 0 20px #00000030;
      animation: zoom-in 0.3s forwards;
      display: flex;
      flex-direction: column;
      @media (max-width: 768px) {
        width: 95%;
        height: 90%;
      }
      .title {
        display: flex;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #ffffff30;
        font-size: 1.2rem;
        span {
          margin-left: 8px;
        }
        .close {
          margin-left: auto;
          cursor: pointer;
          transition: all 0.3s;
          &:hover {
            color: #ff0000;
            transform: scale(1.1);
          }
        }
      }
      .all-list {
        flex: 1;
        display: flex;
        height: 100%;
        overflow: hidden;
        @media (max-width: 768px) {
          flex-direction: column;
        }
        .tabs {
          width: 120px;
          height: 100%;
          border-right: 1px solid #ffffff30;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          padding: 12px 0;
          @media (max-width: 768px) {
            width: 100%;
            height: auto;
            border-right: none;
            border-bottom: 1px solid #ffffff30;
            flex-direction: row;
            justify-content: flex-start;
            overflow-x: auto;
            padding: 0 12px;
          }
          .tab {
            font-size: 1.1rem;
            padding: 14px 0;
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
            text-align: center;
            @media (max-width: 768px) {
              padding: 12px 10px;
              flex-shrink: 0;
            }
            &.active {
              color: #fff;
              font-weight: bold;
              &::before {
                content: "";
                position: absolute;
                left: 20px;
                top: 50%;
                transform: translateY(-50%);
                width: 4px;
                height: 24px;
                border-radius: 4px;
                background: linear-gradient(
                  to bottom,
                  #ff00ff,
                  #00ffff
                );
                box-shadow: 0 0 5px #ff00ff, 0 0 10px #00ffff;
                @media (max-width: 768px) {
                  width: 60%;
                  height: 4px;
                  left: 50%;
                  top: auto;
                  bottom: 0;
                  transform: translateX(-50%);
                  background: linear-gradient(to right, #ff00ff, #00ffff);
                }
              }
            }
            &:not(.active) {
              color: #ffffff80;
              &:hover {
                color: #fff;
              }
            }
          }
        }
        .content {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          .link-all {
            height: auto;
            .item {
              margin-bottom: 20px;
              &:hover {
                transform: translateY(-4px) scale(1.02);
                box-shadow: 0 4px 12px #00000040;
                background: rgb(0 0 0 / 40%);
              }
            }
          }
          @media (max-width: 768px) {
            padding: 20px 10px;
            .link-all {
              .el-col {
                flex: 0 0 50%;
                max-width: 50%;
              }
            }
          }
        }
      }
    }
  }
}

@keyframes zoom-in {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
